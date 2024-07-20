document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const messageList = document.getElementById('messageList');

    // Load and display API key
    chrome.storage.sync.get(['apiKey'], function(result) {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
    });

    // Save API key
    saveApiKeyButton.addEventListener('click', function() {
        const newApiKey = apiKeyInput.value;
        chrome.storage.sync.set({apiKey: newApiKey}, function() {
            alert('API key saved successfully!');
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