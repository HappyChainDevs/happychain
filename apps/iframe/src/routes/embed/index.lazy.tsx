import { createLazyFileRoute } from "@tanstack/react-router"
import { ScreenTokens } from "#src/v2/screens/tokens/Tokens.tsx"

// import { WalletContentInfo } from "#src/components/interface/WalletContentInfo"
// import { ActionButtons } from "#src/components/interface/home/ActionButtons"
// import { AppStatus } from "#src/components/interface/home/AppStatus"
// import { HappyBalance } from "#src/components/interface/home/HappyBalance"

export const Route = createLazyFileRoute("/embed/")({
    component: ScreenTokens
})

/*
function EmbedHome() {
    return (
        <>
            <div className="hidden h-fit lg:grid items-start pt-2 gap-4">
                <HappyBalance />
                <ActionButtons />
                <WalletContentInfo />
            </div>
            <AppStatus />
        </>
    )
}
*/
