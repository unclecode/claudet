// env.backends.onnx.wasm.numThreads = 1;
// env.allowRemoteModels = false;
// env.localModelPath = "models/";
// background.js
import { pipeline, env } from "@xenova/transformers";
import { WaveFile } from 'wavefile';

// Skip initial check for local models
env.allowLocalModels = false;

// Disable multithreading due to a bug in onnxruntime-web
env.backends.onnx.wasm.numThreads = 1;

let currentModel = "groq";
let groqApiKey = "";
let openaiApiKey = "";
let messages = [];
let modelLoadError = false;

chrome.storage.local.get(["messages", "modelLoadError"], function (result) {
    if (result.messages) {
        messages = result.messages;
    }
    if (result.modelLoadError !== undefined) {
        modelLoadError = result.modelLoadError;
    }
});

// Add OpenAI to the storage retrieval
chrome.storage.sync.get(["model", "groqApiKey", "openaiApiKey"], function (result) {
    if (result.model) {
        currentModel = result.model;
    }
    if (result.groqApiKey) {
        groqApiKey = result.groqApiKey;
    }
    if (result.openaiApiKey) {
        openaiApiKey = result.openaiApiKey;
    }
});

// Update the storage change listener
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
        if (key === "model") {
            currentModel = changes[key].newValue;
        } else if (key === "groqApiKey") {
            groqApiKey = changes[key].newValue;
        } else if (key === "openaiApiKey") {
            openaiApiKey = changes[key].newValue;
        } else if (key === "messages" && namespace === "local") {
            messages = changes[key].newValue;
        }
    }
});

class PipelineFactory {
    static task = "automatic-speech-recognition";
    static model = "Xenova/whisper-base";
    static model = 'Xenova/whisper-tiny.en';
    static model = "Xenova/whisper-tiny";
    static quantized = false;
    static instance = null;
    static isLoading = false;

    static async getInstance(progress_callback = null) {
        if (this.instance === null && !this.isLoading) {
            this.isLoading = true;
            try {
                this.instance = await pipeline(this.task, this.model, {
                    quantized: this.quantized,
                    progress_callback,
                    revision: this.model.includes("/whisper-medium") ? "no_attentions" : "main",
                });
            } catch (error) {
                console.log("Error: Error initializing pipeline:", error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        }
        return this.instance;
    }
}

async function transcribeWithAPI(audioArray) {
    try {
        // Reconstruct ArrayBuffer from the array
        const audioBuffer = new Uint8Array(audioArray).buffer;
        const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        const modelName = currentModel === "groq" ? "whisper-large-v3" : "whisper-1";
        formData.append("model", modelName);
        formData.append("response_format", "text");

        const urlBase = currentModel === "groq" ? "https://api.groq.com/openai" : "https://api.openai.com";
        const apiKey = currentModel === "groq" ? groqApiKey : openaiApiKey;

        const transcriptionResponse = await fetch(`${urlBase}/v1/audio/transcriptions`, {
        method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
        });

        if (transcriptionResponse.ok) {
            const data = await transcriptionResponse.text();
            return { success: true, text: data.trim() };
        } else {
            const errorData = await transcriptionResponse.json();
            return { success: false, error: errorData.error.message };
        }
    } catch (error) {
        console.log("Error: Error transcribing audio:", error);
        return { success: false, error: "Unable to transcribe audio. Please try again." };
    }
}


const transcribe = async (audioArrayBuffer, language = "en") => {
    try {
        // let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        let transcriber = await PipelineFactory.getInstance();
        const uint8Array = new Uint8Array(audioArrayBuffer);
        const recoveredBuffer = uint8Array.buffer;
        // Convert audio to required format
        let audioData = await convertAudioToRequiredFormat(recoveredBuffer);

        let output = await transcriber(audioData, {
            top_k: 0,
            do_sample: false,
            chunk_length_s: 15,
            stride_length_s: 3,
            language: language,
            task: "transcribe",
            return_timestamps: false,
        });

        return { success: true, text: output.text };
    } catch (error) {
        console.log("Error: Transcription error:", error);
        return { success: false, error: error.message || "Unknown transcription error" };
    }
};

const convertAudioToRequiredFormat = async (audioArray) => {
    try {

        const wav = new WaveFile();
        
        // Assuming the input is 16-bit PCM audio at 44.1kHz
        wav.fromScratch(1, 16000, '16', audioArray);
        
        // Get WAV file as a Buffer
        const wavBuffer = wav.toBuffer();

        const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });

        // Convert to 32-bit float
        wav.toBitDepth('32f');
        
        // Convert to 16kHz sample rate
        wav.toSampleRate(16000);
        
        let samples = wav.getSamples();
        
        if (Array.isArray(samples)) {
            if (samples.length > 1) {
                // Merge channels
                const SCALING_FACTOR = Math.sqrt(2);
                for (let i = 0; i < samples[0].length; ++i) {
                    samples[0][i] = SCALING_FACTOR * (samples[0][i] + samples[1][i]) / 2;
                }
            }
            samples = samples[0];
        }
        
        return samples;
    } catch (error) {
        console.error("Error converting audio:", error);
        throw new Error("Failed to process audio file. Unsupported format or corrupted file.");
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "transcribe") {
        (async function () {
            try {
                if (currentModel === "groq" && !apiKey) {
                    sendResponse({ success: false, error: "Groq API key not set. Please set it in the extension options." });
                    return;
                }

                let result;

                // refresh currentModel
                chrome.storage.sync.get(["model"], async function (result) {
                    if (result.model) {
                        currentModel = result.model;
                    }

                    if (currentModel === "webgpu") {
                        result = await transcribe(message.audioBuffer, message.language);
                    } else if (currentModel === "groq" || currentModel === "openai") {
                        result = await transcribeWithAPI(message.audioBuffer);
                    }
                    
                    if (result.success) {
                        // Store the message
                        messages.push({
                            text: result.text,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Keep only the last 50 messages
                        if (messages.length > 50) {
                            messages = messages.slice(-50);
                        }
                        
                        // Save to local storage
                        chrome.storage.local.set({ messages: messages });
                    }
                    result.micId = message.micId || "mic-button";
                    sendResponse(result);
                });
                
            } catch (error) {
                sendResponse({ success: false, error: error.message || "Unknown error" });
            }
        })();
        return true; // Indicates we will send a response asynchronously
    }
});

// Optional: Preload the model
PipelineFactory.getInstance((data) => {
    console.log("Preloading model, progress:", data);
}).catch((error) => {
    console.log("Failed to preload model:", error);
    chrome.storage.local.set({ modelLoadError: true });
});