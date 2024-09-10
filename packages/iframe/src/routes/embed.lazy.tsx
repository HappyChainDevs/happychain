import { AuthState, Msgs } from "@happychain/sdk-shared"
import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ConnectButton } from "../components/ConnectButton"
import { DotLinearMotionBlurLoader } from "../components/loaders/DotLinearMotionBlurLoader"
import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { appMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"

import { Power } from "@phosphor-icons/react"
import ActionButtons from "../components/interface/ActionButtons"
import AppStatus from "../components/interface/AppStatus"
import HappyBalance from "../components/interface/HappyBalance"
import UserInfo from "../components/interface/UserInfo"
import WalletContentInfo from "../components/interface/WalletContentInfo"
import { publicClientAtom } from "../state/publicClient"
import { userAtom } from "../state/user"

export const Route = createLazyFileRoute("/embed")({
    component: Embed,
})

function open() {
    void appMessageBus.emit(Msgs.ModalToggle, true)
}

function Embed() {
    const [happyBalance, setHappyBalance] = useState<bigint | undefined>(undefined)

    const authState = useAtomValue(authStateAtom)
    const user = useAtomValue(userAtom)
    const publicClient = useAtomValue(publicClientAtom)

    const web3Providers = useInjectedProviders()
    const socialProviders = useSocialProviders()

    const activeProvider = useMemo(
        () => socialProviders.concat(web3Providers).find((a) => user && a.id === `${user.type}:${user.provider}`),
        [user, socialProviders, web3Providers],
    )

    async function disconnect() {
        await activeProvider?.disable()
        appMessageBus.emit(Msgs.ModalToggle, false)
    }

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

    if (authState === AuthState.Connecting) {
        return (
            <main className="h-screen w-screen flex items-center justify-center">
                    <DotLinearMotionBlurLoader />
            </main>
        )
    }

    if (!user) {
        return <ConnectButton />
    }

    return (
        <>
            <main className="flex h-screen w-screen items-stretch rounded-xl overflow-hidden">
                <div
                    className="w-full h-full transition flex-col  border border-black bg-base-200 items-center justify-start flex"
                    
                >
                    <div className="flex items-center justify-center gap-2 p-1 lg:hidden w-full h-full" onClick={open}>
                         <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-8 rounded-full" />
                         <p className="">{user?.ens || user?.email || user?.name}</p>
                    </div>

                    <span className="text-black text-xl py-2 hidden lg:flex justify-center">🤠 HappyChain</span>

                    <div className="hidden lg:flex w-full items-center justify-between gap-2 bg-slate-200 p-2 border-t border-b border-black">
                        <UserInfo user={user} />
                        <button className="w-6 h-6 rounded-xl" onClick={disconnect} type="button">
                            <Power size={22} />
                        </button>
                    </div>
                    <div className="hidden lg:flex h-full w-full grow flex-col items-start justify-start bg-slate-200 p-2">
                        <HappyBalance balance={happyBalance} />
                        <ActionButtons />
                        <WalletContentInfo />
                        <AppStatus />
                    </div>
                </div>
            </main>
        </>
    )
}
