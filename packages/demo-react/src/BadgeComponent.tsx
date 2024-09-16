import { type BadgeProps, defineBadgeComponent } from "@happychain/ui/define"

defineBadgeComponent("connect-button")

declare global {
    // biome-ignore lint/style/noNamespace:
    namespace JSX {
        interface IntrinsicElements {
            "connect-button": BadgeProps
        }
    }
}

/**
 * Simple wrapper to create a react component from the native web component
 */

export function ConnectButton({ disableStyles }: BadgeProps) {
    return <connect-button disable-styles={disableStyles} />
}
