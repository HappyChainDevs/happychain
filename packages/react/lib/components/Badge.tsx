import type { ConnectButtonProps } from "@happy.tech/core"
export type { ConnectButtonProps }
declare module "react" {
    // biome-ignore lint/style/noNamespace:
    namespace JSX {
        interface IntrinsicElements {
            "happychain-connect-button": ConnectButtonProps
        }
    }
}

/**
 * Simple wrapper to create a react component from the native web component
 */

export function ConnectButton({ disableStyles }: ConnectButtonProps) {
    return <happychain-connect-button disable-styles={disableStyles} />
}
