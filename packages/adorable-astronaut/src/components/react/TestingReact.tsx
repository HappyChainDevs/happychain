import { HappyWalletProvider } from "@happychain/react"
import { defineBadgeComponent } from "@happychain/ui"

defineBadgeComponent()

export function TestingReact() {
    return (
        <HappyWalletProvider>
            <h1>Hello From React</h1>
            <connect-button />
        </HappyWalletProvider>
    )
}
