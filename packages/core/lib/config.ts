/**
 * Shared configuration between the SDK and the iframe.
 */
const fallbackDomain = import.meta.env.DEV ? "http://127.0.0.1:5160" : "https://iframe.happy.tech"

export const config = {
    iframePath: import.meta.env.VITE_IFRAME_URL || fallbackDomain,
}
