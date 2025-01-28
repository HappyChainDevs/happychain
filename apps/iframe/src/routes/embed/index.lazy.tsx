import { createLazyFileRoute } from "@tanstack/react-router"
import WalletContentInfo from "../../components/interface/WalletContentInfo"
import ActionButtons from "../../components/interface/home/ActionButtons"
import AppStatus from "../../components/interface/home/AppStatus"
import HappyBalance from "../../components/interface/home/HappyBalance"

export const Route = createLazyFileRoute("/embed/")({
    component: EmbedHome,
})

function EmbedHome() {
    return (
        <div className="hidden lg:flex flex-1 flex-col items-start gap-4 pt-4">
            <HappyBalance />
            <ActionButtons />
            <WalletContentInfo />
            <AppStatus />
        </div>
    )
}
