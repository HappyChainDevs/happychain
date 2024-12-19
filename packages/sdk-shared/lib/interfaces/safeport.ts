// Type-safe references to browser message port types
// export type SafePort = Pick<globalThis.MessagePort, "onmessage" | "onmessageerror" | "postMessage">
export type SafePort = {
    // biome-ignore lint/suspicious/noExplicitAny: Matches MessagePort
    onmessage: ((ev: MessageEvent<any>) => any) | null

    // biome-ignore lint/suspicious/noExplicitAny: Matches MessagePort
    onmessageerror: ((ev: MessageEvent<any>) => any) | null

    postMessage: <T>(value: T) => void
}
