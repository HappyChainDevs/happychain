declare module "react" {
    // biome-ignore lint/style/noNamespace: necessary to support JSX custom element
    namespace JSX {
        interface IntrinsicElements {
            "happychain-connect-button": Record<string, never>
        }
    }
}

/**
 * Simple wrapper to create a react component from the native web component
 */

export function ConnectButton() {
    return <happychain-connect-button />
}
