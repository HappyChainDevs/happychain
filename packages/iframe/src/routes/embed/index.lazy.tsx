import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useBalance } from "wagmi"

import ActionButtons from "../../components/interface/ActionButtons"
import AppStatus from "../../components/interface/AppStatus"
import HappyBalance from "../../components/interface/HappyBalance"
import WalletContentInfo from "../../components/interface/WalletContentInfo"
import { userAtom } from "../../state/user"

export const Route = createLazyFileRoute("/embed/")({
    component: EmbedHome,
})

function EmbedHome() {
    const user = useAtomValue(userAtom)

    // query fn uses a 10s refetch interval
    const { data: balance } = useBalance({ address: user?.address, query: { refetchInterval: 10000 } })

    return (
        <div className="hidden lg:flex h-full w-full grow flex-col items-start justify-start bg-slate-200 p-2">
            <HappyBalance balance={balance?.value} />
            <ActionButtons />
            <WalletContentInfo />
            <AppStatus />
        </div>
    )
}
