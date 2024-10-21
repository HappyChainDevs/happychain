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
        <div className="hidden lg:flex h-full w-full grow flex-col items-start justify-start bg-slate-200 p-2">
            <HappyBalance />
            <ActionButtons />
            <WalletContentInfo />
            <AppStatus />
        </div>
    )
}
