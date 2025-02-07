import { createLazyFileRoute } from "@tanstack/react-router"
import { WalletContentInfo } from "../../components/interface/WalletContentInfo"
import { ActionButtons } from "../../components/interface/home/ActionButtons"
import { AppStatus } from "../../components/interface/home/AppStatus"

export const Route = createLazyFileRoute("/embed/")({
    component: EmbedHome,
})

function EmbedHome() {
    return (
        <>
            <div className="hidden h-fit lg:grid items-start pt-4 gap-4">
                <ActionButtons />
                <WalletContentInfo />
            </div>
            <AppStatus />
        </>
    )
}
