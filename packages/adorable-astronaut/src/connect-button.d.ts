import type { BadgeProps } from "@happychain/ui"
declare global {
    // biome-ignore lint/style/noNamespace:
    namespace JSX {
        interface IntrinsicElements {
            "connect-button": BadgeProps
        }
    }
}
