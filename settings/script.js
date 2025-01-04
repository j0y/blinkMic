document.addEventListener('DOMContentLoaded', (event) => {
    const micStatusCheckbox = document.getElementById('show-mic-status');
    const blinkCheckbox = document.getElementById('blink-if-try-muted');
    const activeColorInput = document.getElementById('active-color-input');
    const mutedColorInput = document.getElementById('muted-color-input');
    const mutedTryColorInput = document.getElementById('muted-try-color-input');

    micStatusCheckbox.checked = localStorage.getItem('dont-show-mic-status') === 'true';
    blinkCheckbox.checked = localStorage.getItem('dont-blink-if-try-muted') === 'true';
    activeColorInput.value = localStorage.getItem('active-color') || '#00ff00';
    mutedColorInput.value = localStorage.getItem('muted-color') || '#ff0000';
    mutedTryColorInput.value = localStorage.getItem('muted-try-color') || '#ff0000';

    micStatusCheckbox.addEventListener('change', handleCheckboxShowMicStatusChange);
    blinkCheckbox.addEventListener('change', handleCheckboxBlinkIfTryMutedChange);
    activeColorInput.addEventListener('input', handleActiveColorInputChange);
    mutedColorInput.addEventListener('input', handleMutedColorInputChange);
    mutedTryColorInput.addEventListener('input', handleMutedTryColorInputChange);

    function handleCheckboxShowMicStatusChange(event) {
        localStorage.setItem('dont-show-mic-status', event.target.checked);
    }
    function handleCheckboxBlinkIfTryMutedChange(event) {
        localStorage.setItem('dont-blink-if-try-muted', event.target.checked);
    }

    function handleActiveColorInputChange(event) {
        localStorage.setItem('active-color', event.target.value);
    }
    function handleMutedColorInputChange(event) {
        localStorage.setItem('muted-color', event.target.value);
    }
    function handleMutedTryColorInputChange(event) {
        localStorage.setItem('muted-try-color', event.target.value);
    }
});
