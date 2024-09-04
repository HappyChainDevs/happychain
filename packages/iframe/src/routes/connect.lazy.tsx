import { AuthState } from "@happychain/sdk-shared"
import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { ConnectButton } from "../components/ConnectButton"
import { DotLinearMotionBlurLoader } from "../components/loaders/DotLinearMotionBlurLoader"
import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { dappMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"

import { hasPermission } from "../services/permissions/hasPermission"
import { userAtom } from "../state/user"
import { tokenList } from "../utils/lists"
import { publicClientAtom } from "../state/publicClient"
import { formatEther } from "viem"
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

    async function getBalance () {
        if (user) {
            publicClient.chain = happySepChain
            return await publicClient.getBalance({ 
                address: user?.address,
            })
        }

        return undefined
    }

    // useEffect to call getBalance when the component mounts
    useEffect(() => {
        // should there be a constant listener for this?
        const fetchBalance = async () => {
            const balance = await getBalance();
            setHappyBalance(balance);
        };

        if (user) {
            fetchBalance();
        }
    }, [user, publicClient]);

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
                        <div className="flex h-[600px] w-[500px] flex-col gap-4 rounded-xl border-[1px] border-black  bg-base-200 p-4 items-center justify-start" onClick={close}>
                            <span className="text-black text-[20px]">🤠 HappyChain</span>

                            <div className="flex flex-row w-full items-center justify-between gap-2 bg-slate-200 p-2">
                                <div className="flex flex-row space-x-4">
                                    <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-12 rounded-full" />
                                    <div className="flex flex-col items-start justify-between">
                                        <p>{user?.email || user?.name}</p>
                                        <div className="flex flex-row items-center justify-center space-x-1">
                                            <p>{user?.name}</p>
                                            <button className="w-4 h-4 rounded-xl opacity-50" onClick={(e) => {
                                                e.preventDefault();
                                                navigator.clipboard.writeText(user?.address)
                                            }}>
                                                <img src={"/wallet-interface/clipboard-text.svg"}></img>
                                            </button>
                                        </div>
                                        
                                    </div>
                                </div>
                                <img className="w-6 h-6 rounded-xl" src={"/wallet-interface/power.svg"} onClick={disconnect}></img>
                            </div>
                            <div className="flex h-full w-full grow flex-col items-start justify-start rounded bg-slate-200 p-2">
                                <div className="flex flex-row w-full items-center justify-between">
                                    <p className="text-[18px]">$HAPPY</p>
                                    <div className="flex flex-col items-center">
                                        <p className="text-[25px]">{happyBalance ? formatEther(happyBalance) : "--"}</p>
                                    </div>
                                </div>
                                <div className="flex flex-row w-full items-center justify-between px-2 py-4">
                                    <button className="h-10 w-24 bg-slate-400 rounded-xl">Send</button>
                                    <button className="h-10 w-24 bg-slate-400 rounded-xl disabled:opacity-80" disabled>Buy / Sell</button>
                                    <button className="h-10 w-24 bg-slate-400 rounded-xl disabled:opacity-80" disabled>Topup</button>
                                </div>
                                <div className="flex w-full h-full items-start justify-center flex-col px-2">
                                    <div className="flex flex-row items-start justify-center space-x-2">
                                        <button className="h-10 w-24 bg-slate-300 rounded-t-xl">Tokens</button>
                                        <button className="h-10 w-24 bg-slate-300 rounded-t-xl disabled:opacity-80" disabled>Games</button>
                                    </div>
                                    <div className="flex flex-col w-full h-[80%] p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
                                        {tokenList.map((token) => (
                                            <div className="flex flex-row items-center justify-between px-2 h-12">
                                                <span>{`${token.name} (${token.symbol})`}</span>
                                                <span>{`${token.balance}`}</span>
                                            </div>
                                            
                                        ))}
                                    </div>
                                </div>
                                <div className="flex w-full items-center justify-center text-sm font-bold">
                                    {`${hasPermission({ eth_accounts: {} }) ? "\u2705" : "\u274C"} ${document.referrer ? new URL(document.referrer).host : window.location.origin}`}
                                </div>
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
                            <p>{user?.email || user?.name}</p>
                        </div>
                    )}
                </div>
            </main>
        </>
    )
}
