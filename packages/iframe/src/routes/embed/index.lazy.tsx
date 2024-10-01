import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import WalletContentInfo from "../../components/interface/WalletContentInfo"
import ActionButtons from "../../components/interface/home/ActionButtons"
import AppStatus from "../../components/interface/home/AppStatus"
import HappyBalance from "../../components/interface/home/HappyBalance"
import { publicClientAtom } from "../../state/publicClient"
import { userAtom } from "../../state/user"

export const Route = createLazyFileRoute("/embed/")({
    component: EmbedHome,
})

function EmbedHome() {
    const user = useAtomValue(userAtom)
    const publicClient = useAtomValue(publicClientAtom)
    const [happyBalance, setHappyBalance] = useState<bigint | undefined>(undefined)
    const getBalance = useCallback(async () => {
        if (user) {
            return await publicClient.getBalance({
                address: user?.address,
            })
        }
    }, [user, publicClient])

    useEffect(() => {
        const fetchBalance = async () => {
            const balance = await getBalance()
            setHappyBalance(balance)
        }

        if (user) {
            fetchBalance()
        }
    }, [user, getBalance])

    return (
        <div className="hidden lg:flex h-full w-full grow flex-col items-start justify-start bg-slate-200 p-2">
            <HappyBalance balance={happyBalance} />
            <ActionButtons />
            <WalletContentInfo />
            <AppStatus />
        </div>
    )
}
