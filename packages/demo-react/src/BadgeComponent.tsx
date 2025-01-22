import type { BadgeProps } from "@happychain/js"

declare global {
    // biome-ignore lint/style/noNamespace:
    namespace JSX {
        interface IntrinsicElements {
            "happychain-connect-button": BadgeProps
        }
    }
}

/**
 * Simple wrapper to create a react component from the native web component
 */

export function ConnectButton({ disableStyles }: BadgeProps) {
    return <happychain-connect-button disable-styles={disableStyles} />
}
