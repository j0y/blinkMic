'use strict';


/**
 *
 * @module Blink
 */
class Blink { // eslint-disable-line

    #device;
    #isSupported = false;
    #isInAPattern = false;

    #activeColor = [0, 255, 0];  // green
    #mutedColor = [255, 0, 0];  // red
    #attentionColor = [255, 0, 0]; // red

    /**
     * Constructor
     */
    constructor() {
        this.#isSupported = 'hid' in navigator;

        // If HID is not supported, bail.
        if (!this.#isSupported) {
            return;
        }

        chrome.storage.sync.get(['active-color', 'muted-color', 'muted-try-color'], (items) => {
            this.#activeColor = this.hexToRgbArray(items['active-color']) || [0, 255, 0];
            this.#mutedColor =  this.hexToRgbArray(items['muted-color']) || [255, 0, 0];
            this.#attentionColor = this.hexToRgbArray(items['muted-try-color']) || [255, 0, 0];
        })

        // Handle behaviour when the device is connected, or re-connected.
        navigator.hid.addEventListener('connect', async (event) => {
            const connected = await this.connect();
            if (connected) {
                this.#dispatchEvent(event);
            }
        });

        // Handle behaviour if a device is disconnected.
        navigator.hid.addEventListener('disconnect', async (event) => {
            if (event.device === this.#device) {
                await this.disconnect();
                this.#dispatchEvent(event);
            }
        });

        // Reset the device when the page navigates away.
        window.addEventListener('beforeunload', async () => {
            if (this.#device) {
                // await this.reset();
                await this.turnOff();
                this.disconnect();
            }
        });
    }

    /**
     * Reports whether WebHID is supported.
     *
     * @return {boolean}
     */
    get isSupported() {
        return this.#isSupported;
    }

    /**
     * Reports whther the Blink is conected & open.
     *
     * @return {boolean}
     */
    get isConnected() {
        return this.#device?.opened ? true : false;
    }

    hexToRgbArray(hex) {
        if (hex === undefined) {
            return undefined;
        }
        // Remove the '#' if it exists
        hex = hex.replace(/^#/, '');
    
        // Parse the r, g, b values
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
    
        return [r, g, b];
    }

    /**
     * Connect to a Blink device.
     *
     * @fires Blink#connect Notifies listeners we're now connected.
     *
     * @param {boolean} showPicker Show the picker if no device is found.
     * @return {Promise<boolean>} Successfully connected.
     */
    async connect(showPicker) {
        if (!this.#isSupported) {
            throw new Error('Not supported.');
        }
        this.#device = await this.#getDevice(showPicker);
        if (!this.#device) {
            return false;
        }
        console.log('*Blink-Meet*', `Found Blink '${this.#device.productId}'`);

        if (this.#device.opened) {
            return true;
        }

        // Open the HID device.
        try {
            await this.#device.open();
        } catch (ex) {
            console.error('*Blink-Meet*', 'Error opening HID device', ex);
            throw ex;
        }

        return true;
    }

    /**
     * Disconnect from a Blink device.
     *
     * @fires Blink#disconnect Notifies listeners we're no longer connected.
     */
    async disconnect() {
        console.log('*Blink-Meet*', 'Disconnecting Blink');
        if (!this.#device) {
            return;
        }

        await this.#device.close();
        this.#device = null;
    }



    /**
     * Get a Blink device.
     * @param {boolean} showPicker Show the picker if no device is found.
     * @return {Promise<HIDDevice>} Blink HID device.
     */
    async #getDevice(showPicker) {
        const previousDevice = await this.#getPreviousDevice();
        if (previousDevice) {
            return previousDevice;
        }
        if (showPicker) {
            const vendorId = 0x27b8; // blink1 vid
            const productId = 0x01ed;  // blink1 pid
            const devices = await navigator.hid.requestDevice({
                filters: [{ vendorId, productId }],
            });
            return devices[0];
        }
        return null;
    }

    /**
     * Gets a previously connected Blink device.
     *
     * @return {Promise<HIDDevice>} Blink HID device.
     */
    async #getPreviousDevice() {
        const vendorId = 0x27b8; // blink1 vid
        const productId = 0x01ed;  // blink1 pid
        const device_list = await navigator.hid.getDevices();
        console.log(device_list)

        let device = device_list.find(d => d.vendorId === vendorId && d.productId === productId);
        if (device) {
            return device;
        }
        return null;
    }


    /**
     * turnOff the Blink device.
     *
     * @return {?Promise<ArrayBuffer>}
     */
    async turnOff() {
        if (!this.#device?.opened) {
            console.log('already disconnected.');
            return;
        }
        // turn black
        let acolor = [0, 0, 0]; // off
        await this.fadeToColor(acolor);
        return;
    }

    /**
     * Checks if the Blink is connected and ready.
     *
     * @throws {Error} Error if not open and ready.
     * @return {!boolean} True if Blink is open and ready.
     */
    #readyOrThrow() {
        if (!this.#device?.opened) {
            const err = new Error('Not connected.');
            err.name = 'Blink';
            throw err;
        }
        return true;
    }

    /*
     * Event Handlers - implemented since events aren't available.
     */
    #handlers = [];

    /**
     * Adds an event handler for a specific event type.
     *
     * @param {string} type Event type
     * @param {Function} fn Function to call when even type matches
     */
    addEventListener(type, fn) {
        this.#handlers.push({ type, fn });
    }

    /**
     * Removes an event handler for a specific event type.
     *
     * @param {string} type Event type
     * @param {Function} fn Function to call when even type matches
     */
    removeEventListener(type, fn) {
        this.#handlers = this.#handlers.filter((item) => {
            if (item.type !== type) {
                return true;
            }
            if (item.fn !== fn) {
                return true;
            }
        });
    }

    /**
     * Dispatch a existing event.
     *
     * @param {Event} event The event to dispatch
     */
    #dispatchEvent(event) {
        this.#handlers.forEach((handler) => {
            if (event.type === handler.type && handler.fn) {
                handler.fn(event);
            }
        });
    }

    async setColorActive() {
        if (this.#isInAPattern) {
            return;
        }
        await this.fadeToColor(this.#activeColor);
    }
    async setColorBlocked() {
        if (this.#isInAPattern) {
            return;
        }
        let acolor = [255, 0, 0];
        await this.fadeToColor(this.#mutedColor);
    }

    async signalAtention() {
        this.#isInAPattern = true;
        const delay = 300;
        let acolor = this.#attentionColor;
        await this.fadeToColor(acolor);
        await this.sleep(delay);
        await this.turnOff();
        await this.sleep(delay);
        await this.fadeToColor(acolor);
        await this.sleep(delay);
        await this.turnOff();
        await this.sleep(delay);
        await this.fadeToColor(acolor);
        await this.sleep(delay);
        await this.turnOff();
        await this.sleep(delay);
        this.#isInAPattern = false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fadeToColor([r, g, b]) {
        this.#readyOrThrow();
        const reportId = 1;
        const data = Uint8Array.from([0x63, r, g, b, 0x00, 0x10, 0x00, 0x00]);
        try {
            await this.#device.sendFeatureReport(reportId, data);
        } catch (error) {
            console.error('fadeToColor: failed:', error);
        }
    }
}



class MeetWrapper { // eslint-disable-line
    #blinkDevice;
    #dontBlinkIfTryMuted = false;
    #dontShowMicStatus = false;

    /**
     * Constructor
     *
     * @param {HIDDevice} blinkDevice
     */
    constructor(blinkDevice) {
        this.#blinkDevice = blinkDevice;

        chrome.storage.sync.get(['dont-blink-if-try-muted', 'dont-show-mic-status']).then((items) => this.setSettings(items));

        if (document.querySelector('div[data-meeting-title]')) {
            this.checkState();
        }

        const bodyObserver = new MutationObserver((mutations, observer) => {
            if (document.querySelector('div[data-meeting-title]')) {
                //in a meeting
                this.checkState();
            } else if (document.querySelector('[jscontroller=dyDNGc]')) {
                // in lobby
                this.#blinkDevice.turnOff();
            } else if (document.querySelector('[jsname=r4nke]')) {
                // after the meeting
                this.#blinkDevice.turnOff();
            }
        });
        bodyObserver.observe(document.body, { attributes: true, childList: true });


        const mutedObserver = new MutationObserver((mutations, observer) => {
            console.log('mutedAttempt', mutations)
            mutations.forEach((m) => {
                if (m.type == 'childList') {
                    m.addedNodes.forEach(async (n) => {
                        if (
                            n instanceof HTMLDivElement &&
                            n.getAttribute('aria-label') === "Are you talking? Your mic is off."
                        ) {
                            if (this.#dontBlinkIfTryMuted) {
                                return;
                            }
                            console.log('signaling muted state')
                            await this.#blinkDevice.signalAtention();
                            this.checkState();
                        }
                    })
                }
            })
        })
        mutedObserver.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['aria-label']
        })
    }

    setSettings(items) {
        this.#dontBlinkIfTryMuted = items['dont-blink-if-try-muted'] === true;
        this.#dontShowMicStatus =  items['dont-show-mic-status'] === true;
    }

    checkState() {
        console.log('checkState');
        // Check if the user is muted or not.
        if (this.#dontShowMicStatus) {
            return;
        }

        const muted = document.querySelector('button[data-mute-button]')?.getAttribute('data-is-muted') == 'true';
        if (muted) {
            this.#blinkDevice.setColorBlocked();
        } else {
            this.#blinkDevice.setColorActive();
        }
    }
}


/* global MeetWrapper, Blink */

const blinkDevice = new Blink();
const sdConnectButtonID = 'blinkHelperConnect';


/**
 * Adds a Connect to Blink button to the page.
 */
function addConnectButton() {
    if (window.location.pathname === '/' && window.location.pathname === '/landing') {
        return;
    }
    const elem = document.createElement('button');
    elem.id = sdConnectButtonID;
    elem.type = 'button';
    elem.innerText = 'Connect Blink';
    elem.style = 'position: absolute;top: 100px;left:100px;z-index:100';
    elem.addEventListener('click', async () => {
        elem.remove();
        await blinkDevice.connect(true);
        startWrapper();
    });
    document.body.appendChild(elem);
}

/**
 * Check if the Blink is open, and start the Meet Helper, otherwise
 * show the connect button.
 *
 * @return {boolean} True if the Blink is connected.
 */
function startWrapper() {
    if (blinkDevice.isConnected) {
        const elem = document.getElementById(sdConnectButtonID);
        if (elem) {
            elem.remove();
        }
        new MeetWrapper(blinkDevice);
        return true;
    }
    addConnectButton();
    return false;
}

/**
 * Initialization, attempts to open the Blink and then the Meet Wrapper.
 */
async function go() {
    if (window.location.pathname.startsWith('/linkredirect')) {
        return;
    }
    await blinkDevice.connect();
    if (startWrapper()) {
        return;
    }
    blinkDevice.addEventListener('connect', () => {
        startWrapper();
    });
}

go();

