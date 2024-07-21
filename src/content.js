let isRecording = false;
let isTranscribing = false;
let audioContext;
let mediaRecorder;
let audioChunks = [];
const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // 1 second
const WHISPER_SAMPLING_RATE = 16000;

const bgColor = "#222220";
const iconColor = "#a4a49f";

const recordIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="12" fill="${bgColor}"/>
  <circle cx="12" cy="12" r="11" stroke="${iconColor}" stroke-width="2"/>
  <circle cx="12" cy="12" r="4" fill="${iconColor}"/>
</svg>`;

const stopIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="12" fill="${bgColor}"/>
  <circle cx="12" cy="12" r="11" stroke="${iconColor}" stroke-width="2"/>
  <rect x="7" y="7" width="10" height="10" fill="${iconColor}"/>
</svg>`;

const waitIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="12" fill="${bgColor}"/>
  <circle cx="12" cy="12" r="11" stroke="${iconColor}" stroke-width="2"/>
  <circle cx="12" cy="12" r="6" fill="${iconColor}" class="pulse-circle"/>
</svg>`;

const closeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function insertMicrophoneButton() {
    const targetDiv = document.querySelector(".flex.min-h-4.flex-1.items-center");
    if (targetDiv) {
        // remove claudet container if it already exists
        const existingContainer = document.querySelector(".alaudet-mic-container");
        if (existingContainer) {
            existingContainer.remove();
        }
        // remove error message if it already exists
        const existingError = document.getElementById("error-message");
        if (existingError) {
            existingError.remove();
        }
        const containerDiv = document.createElement("div");
        containerDiv.classList.add("alaudet-mic-container");
        containerDiv.style.cssText =
            "display: flex; flex-direction: column; align-items: flex-start; margin-right: 10px;";


        
        const micButton = document.createElement("button");
        micButton.innerHTML = recordIcon;
        micButton.id = "mic-button";
        micButton.style.cssText = "background: none; border: none; cursor: pointer;";
        micButton.onclick = checkSettingsAndToggleRecording;;

        const infoSpeechDiv = document.createElement("div");
        infoSpeechDiv.classList.add("flex");
        infoSpeechDiv.id = "error-message";
        infoSpeechDiv.style.cssText =
            "color: #e27c5b; font-size: 12px; margin-top: 5px; align-items: center; background-color: #2b2b267a; border: 1px solid #e27c5b; border-radius: 5px; padding: 0.25em 0.5em; display: none;";

        containerDiv.appendChild(micButton);
        targetDiv.parentNode.insertBefore(containerDiv, targetDiv);
        targetDiv.parentElement.parentElement.appendChild(infoSpeechDiv);
    } else {
        console.error("Target div for microphone button not found");
    }
}

function checkSettingsAndToggleRecording() {
    chrome.storage.sync.get(['model', 'apiKey'], function(result) {
        if (result.model === 'groq' && !result.apiKey) {
            showError("Groq API key not set. Please set it in the extension options.");
            return;
        }

        if (result.model === 'webgpu') {
            chrome.storage.local.get(['modelLoadError'], function(localResult) {
                if (localResult.modelLoadError) {
                    showError("WebGPU model failed to load. Please try again or switch to Groq in the extension options.");
                } else {
                    toggleRecording();
                }
            });
        } else {
            toggleRecording();
        }
    });
}

function showError(message) {
    const infoSpeechDiv = document.getElementById("error-message");
    if (infoSpeechDiv) {
        // create a div and set text to it
        const div = document.createElement("div");
        div.textContent = message;
        // set flex to 1
        div.style.flex = "1";

        const closeButton = document.createElement("button");
        closeButton.innerHTML = closeIcon;
        closeButton.style.cssText = "background: none; border: none; cursor: pointer; margin-left: 5px;";
        closeButton.onclick = closeError;

        // Disable the mic button
        const micButton = document.getElementById("mic-button");
        if (micButton) {
            micButton.disabled = true;
            micButton.style.opacity = "0.5";
        }

        infoSpeechDiv.appendChild(div);
        infoSpeechDiv.appendChild(closeButton);

        // rset display to flex
        infoSpeechDiv.style.display = "flex";
    }
}

function closeError() {
    const infoSpeechDiv = document.getElementById("error-message");
    if (infoSpeechDiv) {
        infoSpeechDiv.style.display = "none";
        infoSpeechDiv.textContent = "";
    }
    // Re-enable the mic button
    const micButton = document.getElementById("mic-button");
    if (micButton) {
        micButton.disabled = false;
        micButton.style.opacity = "1";
    }
}

function toggleRecording() {
    closeError(); // Close any existing error message
    const micButton = document.getElementById("mic-button");
    if (!isRecording && !isTranscribing) {
        startRecording();
        micButton.innerHTML = stopIcon;
        micButton.style.animation = "spin 2s linear infinite";
    } else if (isRecording) {
        stopRecording();
        micButton.innerHTML = waitIcon;
        micButton.style.animation = "";
        micButton.disabled = true;
        isTranscribing = true;
    }
}

let mediaRecorderRef = { current: null };
let audioChunksRef = { current: [] };

function startRecording() {
    navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.addEventListener("dataavailable", (event) => {
                console.log("Data available");
                audioChunksRef.current.push(event.data);
            });

            mediaRecorder.start();
            isRecording = true;

            const micButton = document.getElementById("mic-button");
            micButton.innerHTML = stopIcon;
            micButton.style.animation = "spin 2s linear infinite";
        })
        .catch((error) => {
            console.error("Error accessing microphone:", error);
            showError("Error accessing microphone. Please check your permissions.");
            resetRecordingState();
        });
}

function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.addEventListener("stop", transcribeAudio);
        mediaRecorderRef.current.stop();
        isRecording = false;
        isTranscribing = true;

        const micButton = document.getElementById("mic-button");
        micButton.innerHTML = waitIcon;
        micButton.style.animation = "";
        micButton.disabled = true;
    }
}



async function transcribeAudio(retryCount = 0) {
    if (retryCount >= MAX_RETRIES) {
        showError("Maximum retry attempts reached. Please try again later.");
        resetRecordingState();
        return;
    }

    if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
        console.error("No audio data available");
        showError("No audio data recorded. Please try again.");
        resetRecordingState();
        return;
    }

    try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        if (audioBlob.size === 0) {
            throw new Error("Audio blob is empty");
        }

        const buffer = await audioBlob.arrayBuffer();

        if (buffer.byteLength === 0) {
            throw new Error("Array buffer is empty");
        }

        const uint8Array = new Uint8Array(buffer);
        
        if (uint8Array.length === 0) {
            throw new Error("Uint8Array is empty");
        }

        chrome.runtime.sendMessage(
            {
                action: "transcribe",
                audioBuffer: Array.from(uint8Array),
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError);
                    retryTranscription(retryCount);
                } else {
                    handleTranscription(response);
                }
            }
        );
    } catch (error) {
        console.log("Error: Error processing audio:", error);
        retryTranscription(retryCount);
    }
}

function retryTranscription(retryCount) {
    console.log(`Retrying transcription (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
    setTimeout(() => transcribeAudio(retryCount + 1), RETRY_DELAY);
}

function showRetryMessage(retryCount) {
    showError(`Error processing audio. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
}

function handleTranscription(response) {
    const micButton = document.getElementById("mic-button");
    isTranscribing = false;
    micButton.disabled = false;
    micButton.style.animation = "";
    micButton.innerHTML = recordIcon;

    if (response.success && response.text) {
        insertTranscribedText(response.text);
        initializeExtension();
    } else {
        showError(response.error || "Transcription failed. Please try again.");
    }
}

function insertTranscribedText(text) {
    const inputDiv = document.querySelector('[contenteditable="true"]');
    if (inputDiv) {
        inputDiv.focus();
        document.execCommand("insertText", false, text);
    } else {
        console.error("Contenteditable div not found");
        showError("Error inserting transcribed text. Please try again.");
    }
}

function resetRecordingState() {
    const micButton = document.getElementById("mic-button");
    isRecording = false;
    isTranscribing = false;
    micButton.disabled = false;
    micButton.style.animation = "";
    micButton.innerHTML = recordIcon;
}

function sendMessageToBackground(message) {
    if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message, handleTranscription);
    } else {
        // If chrome.runtime is not available, retry after a short delay
        setTimeout(() => checkRuntimeAndSendMessage(message), 1000);
    }
}

function checkRuntimeAndSendMessage(message, retries = 5) {
    if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message, handleTranscription);
    } else if (retries > 0) {
        // If chrome.runtime is still not available, retry with a decremented retry count
        setTimeout(() => checkRuntimeAndSendMessage(message, retries - 1), 1000);
    } else {
        console.error("Chrome runtime not available after multiple retries");
        showError("Error communicating with the extension. Please refresh the page and try again.");
        resetRecordingState();
    }
}

// CSS for the animations
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .pulse-circle {
    transform-origin: center;
    transform-box: fill-box;
    animation: pulse 1s ease-in-out infinite;
  }
`;
document.head.appendChild(style);


// if (document.readyState === "loading") {
//     document.addEventListener("DOMContentLoaded", initializeExtension);
// } else {
//     initializeExtension();
// }

function initializeExtension() {
    insertMicrophoneButton();
    console.log("Microphone button inserted");
    // Add any other initialization code here
}

// Additional event listener for dynamically loaded content
const observeDOM = () => {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                const targetDiv = document.querySelector(".flex.min-h-4.flex-1.items-center");
                if (targetDiv && !targetDiv.previousSibling && !targetDiv.previousSibling?.matches("button")) {
                    insertMicrophoneButton();
                    console.log("Microphone button inserted after dynamic load");
                    observer.disconnect(); // Stop observing once button is inserted
                    break;
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
};

// Start observing the DOM for changes
setTimeout(observeDOM, 200);
