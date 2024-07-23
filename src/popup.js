document.addEventListener('DOMContentLoaded', function() {
    const modelSelect = document.getElementById('modelSelect');
    const groqApiKeyContainer = document.getElementById('groqApiKeyContainer');
    const openaiApiKeyContainer = document.getElementById('openaiApiKeyContainer');
    const groqApiKeyInput = document.getElementById('groqApiKey');
    const openaiApiKeyInput = document.getElementById('openaiApiKey');
    const saveButton = document.getElementById('saveButton');

    // Load saved settings
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

    modelSelect.addEventListener('change', toggleApiKeyVisibility);

    saveButton.addEventListener('click', function() {
        const model = modelSelect.value;
        const groqApiKey = groqApiKeyInput.value;
        const openaiApiKey = openaiApiKeyInput.value;

        chrome.storage.sync.set({
            model: model,
            groqApiKey: groqApiKey,
            openaiApiKey: openaiApiKey
        }, function() {
            console.log('Settings saved');
            document.getElementById('saveResponse').textContent = 'Settings saved.';
            setTimeout(() => window.close(), 1000);
        });
    });

    function toggleApiKeyVisibility() {
        groqApiKeyContainer.style.display = modelSelect.value === 'groq' ? 'block' : 'none';
        openaiApiKeyContainer.style.display = modelSelect.value === 'openai' ? 'block' : 'none';
    }
});