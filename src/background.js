// env.backends.onnx.wasm.numThreads = 1;
// env.allowRemoteModels = false;
// env.localModelPath = "models/";
// background.js
import { pipeline, env } from "@xenova/transformers";

// Skip initial check for local models
env.allowLocalModels = false;

// Disable multithreading due to a bug in onnxruntime-web
env.backends.onnx.wasm.numThreads = 1;

let currentModel = "groq";
let apiKey = "";
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

chrome.storage.sync.get(["model", "apiKey"], function (result) {
    if (result.model) {
        currentModel = result.model;
    }
    if (result.apiKey) {
        apiKey = result.apiKey;
    }
});


chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
        if (key === "model") {
            currentModel = changes[key].newValue;
        } else if (key === "apiKey") {
            apiKey = changes[key].newValue;
        } else if (key === "messages" && namespace === "local") {
            messages = changes[key].newValue;
        }
    }
});

class PipelineFactory {
    static task = "automatic-speech-recognition";
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

async function transcribeWithGroq(audioArray) {
    try {
        // Reconstruct ArrayBuffer from the array
        const audioBuffer = new Uint8Array(audioArray).buffer;
        const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("model", "whisper-large-v3");
        formData.append("response_format", "text");

        const transcriptionResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
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

const transcribe = async (audio, language = "en") => {
    try {
        let transcriber = await PipelineFactory.getInstance((data) => {
            console.log("Model loading progress:", data);
            // You could send this progress data to the content script if you want to show a loading indicator
        });

        let output = await transcriber(new Float32Array(audio), {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "transcribe") {
        (async function () {
            try {
                if (currentModel === "groq" && !apiKey) {
                    sendResponse({ success: false, error: "Groq API key not set. Please set it in the extension options." });
                    return;
                }

                let result;
                if (currentModel === "webgpu") {
                    if (modelLoadError) {
                        sendResponse({ success: false, error: "WebGPU model failed to load. Please try again or switch to Groq." });
                        return;
                    }
                    result = await transcribe(message.audio, message.language);
                } else if (currentModel === "groq") {
                    result = await transcribeWithGroq(message.audioBuffer);
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
                
                sendResponse(result);
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