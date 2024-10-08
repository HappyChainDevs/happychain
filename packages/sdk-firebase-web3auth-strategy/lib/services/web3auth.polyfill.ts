/**
 * Web3Auth Required Polyfills
 * For use in a SharedWorker context as in a regular context.
 * In a regular build system there are easier ways to polyfill
 * but in the web worker its not so easy
 */

// supply window.Buffer functionality
// biome-ignore lint/style/useNodejsImportProtocol: its the npm module polyfill, not the nodejs import
import Buffer from "buffer"
globalThis.Buffer = globalThis.Buffer || Buffer.Buffer

// web3Auth uses global.XXX but global is not defined in the SharedWorker
if (typeof global === "undefined") {
    globalThis.global = globalThis
}

// web3Auth uses window.XXX but window is not defined in the SharedWorker
if (typeof window === "undefined") {
    // @ts-expect-error web3auth accesses this, but its not available in SharedWorker context
    // and its not compiled away by vite
    globalThis.window = globalThis
}

// web3Auth uses process.env.NODE_DEBUG but process.env is not defined in the SharedWorker
// we make use of other env variables for the web3 setup also
if (typeof process === "undefined") {
    // @ts-expect-error web3auth accesses this, but its not available in SharedWorker context
    // and its not compiled away by vite
    globalThis.process = { env: import.meta.env }
}
