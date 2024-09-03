import { AuthState } from "@happychain/sdk-shared"
import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useMemo, useState } from "react"
import { ConnectButton } from "../components/ConnectButton"
import { DotLinearMotionBlurLoader } from "../components/loaders/DotLinearMotionBlurLoader"
import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { dappMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"

import { hasPermission } from "../services/permissions/hasPermission"
import { userAtom } from "../state/user"

export const Route = createLazyFileRoute("/connect")({
    component: Connect,
})

function Connect() {
    const authState = useAtomValue(authStateAtom)
    const user = useAtomValue(userAtom)
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
                        <div className="flex h-72 w-72 flex-col gap-4 rounded-lg bg-base-200 p-4" onClick={close}>
                            <div className="flex items-center justify-center gap-2">
                                <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-8 rounded-full" />
                                <p>{user?.email || user?.name}</p>
                            </div>
                            <div className="flex h-full w-full grow flex-col items-end justify-end rounded bg-slate-200 p-4">
                                <div className="text-xs font-bold">
                                    Connected To:{" "}
                                    {document.referrer ? new URL(document.referrer).host : window.location.origin}
                                </div>
                                <div className="text-xs font-bold">
                                    Has Access Permissions: {hasPermission({ eth_accounts: {} }) ? "true" : "false"}
                                </div>
                                <button type="button" onClick={disconnect} className="btn btn-warning">
                                    Logout
                                </button>
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
