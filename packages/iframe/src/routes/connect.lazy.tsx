import { AuthState } from "@happychain/sdk-shared"
import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ConnectButton } from "../components/ConnectButton"
import { DotLinearMotionBlurLoader } from "../components/loaders/DotLinearMotionBlurLoader"
import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { dappMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"

import ActionButtons from "../components/interface/ActionButtons"
import AppStatus from "../components/interface/AppStatus"
import HappyBalance from "../components/interface/HappyBalance"
import UserInfo from "../components/interface/UserInfo"
import WalletTabs from "../components/interface/WalletTabs"
import { publicClientAtom } from "../state/publicClient"
import { userAtom } from "../state/user"
import { happySepChain } from "../utils/chainConfig"

export const Route = createLazyFileRoute("/connect")({
    component: Connect,
})

function Connect() {
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
            publicClient.chain = happySepChain
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
        dappMessageBus.emit("modal-toggle", true)
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
        dappMessageBus.emit("modal-toggle", false)
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
                            className="flex h-[600px] w-[500px] flex-col rounded-xl border-[1px] border-black  bg-base-200 items-center justify-start"
                            onClick={close}
                        >
                            <span className="text-black text-[20px] py-2">🤠 HappyChain</span>

                            <div className="flex flex-row w-full items-center justify-between gap-2 bg-slate-200 p-2 border-t border-b border-black">
                                <UserInfo user={user} />
                                <button
                                    className="w-6 h-6 rounded-xl"
                                    onClick={disconnect}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            disconnect()
                                        }
                                    }}
                                    type="button"
                                >
                                    <img
                                        className="w-6 h-6 rounded-xl"
                                        src={"/wallet-interface/power.svg"}
                                        alt="Disconnect"
                                    />
                                </button>
                            </div>
                            <div className="flex h-full w-full grow flex-col items-start justify-start rounded-b-xl bg-slate-200 p-2">
                                <HappyBalance balance={happyBalance} />
                                <ActionButtons />
                                <WalletTabs />
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
