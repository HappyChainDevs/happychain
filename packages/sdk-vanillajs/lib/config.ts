/**
 * HappyProvider Build Time Configuration.
 *
 * In production builds, IFRAME_URL can be set in the local .env as it will be built into the bundle.
 *
 * In development, the consuming app/demo can (optionally) set VITE_IFRAME_URL to override the
 * default value. This can be useful when attempting to test the demos from a separate device from
 * the dev server, such as a phone or tablet.
 */
export const config = {
    iframePath: import.meta.env.IFRAME_URL || import.meta.env.VITE_IFRAME_URL || "http://localhost:5160",
}
