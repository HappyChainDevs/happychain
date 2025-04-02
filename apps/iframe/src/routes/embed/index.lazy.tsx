import { createLazyFileRoute } from "@tanstack/react-router"
import { ScreenEmbedDedfault } from "#src/v2/screens/embed/EmbedDefault"

// import { WalletContentInfo } from "#src/components/interface/WalletContentInfo"
// import { ActionButtons } from "#src/components/interface/home/ActionButtons"
// import { AppStatus } from "#src/components/interface/home/AppStatus"
// import { HappyBalance } from "#src/components/interface/home/HappyBalance"

export const Route = createLazyFileRoute("/embed/")({
    component: ScreenEmbedDedfault,
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
