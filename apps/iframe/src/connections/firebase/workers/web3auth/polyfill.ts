/**
 * Web3Auth Required Polyfills
 * For use in a SharedWorker context as in a regular context.
 * In a regular build system there are easier ways to polyfill,
 * but in the web worker it's not so easy.
 */

// supply window.Buffer functionality
// Trailing slash is suggested here https://www.npmjs.com/package/buffer#usage
// it differentiates between 'node_modules/buffer/' and 'node:buffer'
import { Buffer } from "buffer/"
globalThis.Buffer = globalThis.Buffer || Buffer

// web3Auth uses global.XXX but global is not defined in the SharedWorker
if (typeof global === "undefined") {
    globalThis.global = globalThis
}

// web3Auth uses window.XXX but window is not defined in the SharedWorker
if (typeof window === "undefined") {
    // @ts-expect-error
    globalThis.window = globalThis
}

// Web3Auth uses process.env.NODE_DEBUG but process.env is not defined in the SharedWorker.
// We also make use of other env variables for setting up Web3Auth defaults, so this injects
// them from the vite build step.
if (typeof process === "undefined") {
    // @ts-expect-error
    globalThis.process = {
        env: import.meta.env,
        // Polyfill for process.nextTick. Fixes the following line in web3auth:
        // var qnt = global.Bare ? queueMicrotask : process.nextTick.bind(process);
        nextTick: queueMicrotask,
    }
}
