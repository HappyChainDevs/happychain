/**
 * Shared configuration between the SDK and the iframe.
 */
export const config = {
    iframePath: import.meta.env.IFRAME_URL || "http://localhost:5160",
}
