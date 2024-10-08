/**
 * Web3Auth Required Polyfills
 *
 * Primarily for use in a SharedWorker context as in a regular context
 * there are easier/better ways to polyfill/ponyfill these
 */

// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import Buffer from "buffer"
globalThis.Buffer = globalThis.Buffer || Buffer.Buffer
if (typeof global === "undefined") {
    globalThis.global = globalThis
}
if (typeof window === "undefined") {
    //@ts-ignore
    globalThis.window = globalThis
}

if (typeof process === "undefined") {
    //@ts-ignore
    globalThis.process = { env: import.meta.env }
}
