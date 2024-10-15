import { createLazyFileRoute } from "@tanstack/react-router"

import ActionButtons from "../../components/interface/ActionButtons"
import AppStatus from "../../components/interface/AppStatus"
import HappyBalance from "../../components/interface/HappyBalance"
import WalletContentInfo from "../../components/interface/WalletContentInfo"

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
