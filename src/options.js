document.addEventListener('DOMContentLoaded', function() {
    const modelSelect = document.getElementById('modelSelect');
    const groqApiKeyInput = document.getElementById('groqApiKey');
    const openaiApiKeyInput = document.getElementById('openaiApiKey');
    const saveSettingsButton = document.getElementById('saveSettings');
    const messageList = document.getElementById('messageList');
    const groqApiKeyContainer = document.getElementById('groqApiKeyContainer');
    const openaiApiKeyContainer = document.getElementById('openaiApiKeyContainer');

    // Load and display settings
    chrome.storage.sync.get(['model', 'groqApiKey', 'openaiApiKey'], function(result) {
        if (result.model) {
            modelSelect.value = result.model;
        }
        if (result.groqApiKey) {
            groqApiKeyInput.value = result.groqApiKey;
        }
        if (result.openaiApiKey) {
            openaiApiKeyInput.value = result.openaiApiKey;
        }
        toggleApiKeyVisibility();
    });

    // Toggle API key input visibility based on selected model
    function toggleApiKeyVisibility() {
        const selectedModel = modelSelect.value;
        groqApiKeyContainer.style.display = selectedModel === 'groq' ? 'block' : 'none';
        openaiApiKeyContainer.style.display = selectedModel === 'openai' ? 'block' : 'none';
    }

    modelSelect.addEventListener('change', toggleApiKeyVisibility);

    // Save settings
    saveSettingsButton.addEventListener('click', function() {
        const model = modelSelect.value;
        const groqApiKey = groqApiKeyInput.value;
        const openaiApiKey = openaiApiKeyInput.value;

        chrome.storage.sync.set({
            model: model,
            groqApiKey: groqApiKey,
            openaiApiKey: openaiApiKey
        }, function() {
            alert('Settings saved successfully!');
        });
    });

    // Load and display messages
    function loadMessages() {
        chrome.storage.local.get(['messages'], function(result) {
            if (result.messages && result.messages.length > 0) {
                messageList.innerHTML = '';
                result.messages.forEach(function(msg) {
                    const li = document.createElement('li');
                    li.textContent = `${new Date(msg.timestamp).toLocaleString()}: ${msg.text}`;
                    messageList.appendChild(li);
                });
            } else {
                messageList.innerHTML = '<li>No messages yet.</li>';
            }
        });
    }

    loadMessages();

    // Refresh messages every 5 seconds
    setInterval(loadMessages, 5000);
});