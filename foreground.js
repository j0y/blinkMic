'use strict';


/**
 *
 * @module Blink
 */
class Blink { // eslint-disable-line

    #device;
    #isSupported = false;

    /**
     * Constructor
     */
    constructor() {
        this.#isSupported = 'hid' in navigator;

        // If HID is not supported, bail.
        if (!this.#isSupported) {
            return;
        }

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

    async handleConnectClick() {
        let acolor = [255, 0, 255];  // purple
        await this.fadeToColor(acolor);
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

    /**
     * Constructor
     *
     * @param {HIDDevice} blinkDevice
     */
    constructor(blinkDevice) {
        this.#blinkDevice = blinkDevice;


        //TODO: check if device was connected just now and initialize state.
        // Cause this runs only on change.
        const bodyObserver = new MutationObserver(() => {
            if (document.querySelector('div[data-meeting-title]')) {
                //in a meeting
                this.#blinkDevice.handleConnectClick();
            } else if (document.querySelector('[jscontroller=dyDNGc]')) {
                // in lobby
                this.#blinkDevice.turnOff();
            } else if (document.querySelector('[jsname=r4nke]')) {
                // after the meeting
                this.#blinkDevice.turnOff();
            }
        });
        bodyObserver.observe(document.body, { attributes: true, childList: true });
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

