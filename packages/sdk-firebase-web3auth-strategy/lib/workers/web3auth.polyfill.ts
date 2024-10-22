/**
 * Web3Auth Required Polyfills
 * For use in a SharedWorker context as in a regular context.
 * In a regular build system there are easier ways to polyfill,
 * but in the web worker it's not so easy.
 */

// supply window.Buffer functionality
// biome-ignore lint/style/useNodejsImportProtocol: it's the npm module polyfill, not the Node.js import
import Buffer from "buffer"
globalThis.Buffer = globalThis.Buffer || Buffer.Buffer

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
// We make use of other env variables for the Web3Auth setup also.
if (typeof process === "undefined") {
    // @ts-expect-error
    globalThis.process = { env: import.meta.env }
}
