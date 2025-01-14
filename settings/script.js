document.addEventListener('DOMContentLoaded', (event) => {
    const micStatusCheckbox = document.getElementById('show-mic-status');
    const blinkCheckbox = document.getElementById('blink-if-try-muted');
    const activeColorInput = document.getElementById('active-color-input');
    const mutedColorInput = document.getElementById('muted-color-input');
    const mutedTryColorInput = document.getElementById('muted-try-color-input');
    const sidesInput = document.getElementById('sides-input');

    chrome.storage.sync.get(['dont-show-mic-status', 'dont-blink-if-try-muted', 'active-color', 'muted-color', 'muted-try-color', 'sides'], function (items) {
        micStatusCheckbox.checked = items['dont-show-mic-status'] === true;
        blinkCheckbox.checked = items['dont-blink-if-try-muted'] === true;
        activeColorInput.value = items['active-color'] || '#00ff00';
        mutedColorInput.value = items['muted-color'] || '#ff0000';
        mutedTryColorInput.value = items['muted-try-color'] || '#ff0000';
        if (items['sides'] === undefined) {
            sidesInput.value = '0';
        } else {
            sidesInput.value = String(items['sides']);
        }
    });

    micStatusCheckbox.addEventListener('change', handleCheckboxShowMicStatusChange);
    blinkCheckbox.addEventListener('change', handleCheckboxBlinkIfTryMutedChange);
    activeColorInput.addEventListener('change', handleActiveColorInputChange);
    mutedColorInput.addEventListener('change', handleMutedColorInputChange);
    mutedTryColorInput.addEventListener('change', handleMutedTryColorInputChange);
    sidesInput.addEventListener('change', handleSidesChange);

    function handleCheckboxShowMicStatusChange(event) {
        chrome.storage.sync.set({ 'dont-show-mic-status': event.target.checked });
    }
    function handleCheckboxBlinkIfTryMutedChange(event) {
        chrome.storage.sync.set({ 'dont-blink-if-try-muted': event.target.checked });
    }

    function handleActiveColorInputChange(event) {
        chrome.storage.sync.set({ 'active-color': event.target.value });
    }
    function handleMutedColorInputChange(event) {
        chrome.storage.sync.set({ 'muted-color': event.target.value });
    }
    function handleMutedTryColorInputChange(event) {
        chrome.storage.sync.set({ 'muted-try-color': event.target.value });
    }
    function handleSidesChange(event) {
        chrome.storage.sync.set({ 'sides': Number(event.target.value) });
    }
});
