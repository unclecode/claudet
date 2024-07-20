document.addEventListener('DOMContentLoaded', function() {
    const modelSelect = document.getElementById('modelSelect');
    const apiKeyContainer = document.getElementById('apiKeyContainer');
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveButton');

    // Load saved settings
    chrome.storage.sync.get(['model', 'apiKey'], function(result) {
        if (result.model) {
            modelSelect.value = result.model;
        }
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
        toggleApiKeyVisibility();
    });

    modelSelect.addEventListener('change', toggleApiKeyVisibility);

    saveButton.addEventListener('click', function() {
        const model = modelSelect.value;
        const apiKey = apiKeyInput.value;

        chrome.storage.sync.set({
            model: model,
            apiKey: apiKey
        }, function() {
            console.log('Settings saved');
            // Optionally, show a "Settings saved" message to the user
            document.getElementById('saveResponse').textContent = 'Settings saved.';
            // close the popup
            setTimeout(() => window.close(), 1000);
        });
    });

    function toggleApiKeyVisibility() {
        apiKeyContainer.style.display = modelSelect.value === 'groq' ? 'block' : 'none';
    }
});