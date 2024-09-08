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

function Embed() {
    const [happyBalance, setHappyBalance] = useState<bigint | undefined>(undefined)

    const authState = useAtomValue(authStateAtom)
    const user = useAtomValue(userAtom)
    const publicClient = useAtomValue(publicClientAtom)

    const web3Providers = useInjectedProviders()
    const socialProviders = useSocialProviders()

    const [isOpen, setIsOpen] = useState(false)

    const activeProvider = useMemo(
        () => socialProviders.concat(web3Providers).find((a) => user && a.id === `${user.type}:${user.provider}`),
        [user, socialProviders, web3Providers],
    )

    async function disconnect() {
        await activeProvider?.disable()
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

    function open() {
        void appMessageBus.emit(Msgs.ModalToggle, true)
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
        void appMessageBus.emit(Msgs.ModalToggle, false)
    }

    if (authState === AuthState.Connecting) {
        return (
            <main className="min-h-dvh w-screen">
                <div className="fixed right-4 top-4 flex h-12 w-20 items-center justify-center">
                    <DotLinearMotionBlurLoader />
                </div>
            </main>
        )
    }

    if (!user) {
        return <ConnectButton />
    }

    return (
        <>
            <main className="fixed right-4 top-4 flex min-h-dvh w-screen items-stretch gap-4">
                <div className="absolute right-0 top-0">
                    {isOpen && (
                        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
                        <div
                            className="flex h-[600px] w-[500px] flex-col rounded-xl border border-black  bg-base-200 items-center justify-start"
                            onClick={close}
                        >
                            <span className="text-black text-xl py-2">🤠 HappyChain</span>

                            <div className="flex flex-row w-full items-center justify-between gap-2 bg-slate-200 p-2 border-t border-b border-black">
                                <UserInfo user={user} />
                                <button className="w-6 h-6 rounded-xl" onClick={disconnect} type="button">
                                    <Power size={22} />
                                </button>
                            </div>
                            <div className="flex h-full w-full grow flex-col items-start justify-start rounded-b-xl bg-slate-200 p-2">
                                <HappyBalance balance={happyBalance} />
                                <ActionButtons />
                                <WalletContentInfo />
                                <AppStatus />
                            </div>
                        </div>
                    )}

                    {!isOpen && (
                        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
                        <div
                            className="flex w-44 items-center justify-center gap-2 rounded-lg bg-base-200 p-2"
                            onClick={open}
                        >
                            <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-8 rounded-full" />
                            <p>{user?.ens || user?.email || user?.name}</p>
                        </div>
                    )}
                </div>
            </main>
        </>
    )
}
