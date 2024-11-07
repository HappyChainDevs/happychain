import { AuthState, WalletDisplayAction, waitForCondition } from "@happychain/sdk-shared"
import { Msgs } from "@happychain/sdk-shared"
import { Outlet, createLazyFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { getAuthState } from "#src/state/authState.ts"
import { ConnectModal } from "../components/ConnectModal"
import GlobalHeader from "../components/interface/GlobalHeader"
import UserInfo from "../components/interface/UserInfo"
import { DialogConfirmSignOut } from "../components/interface/menu-secondary-actions/DialogConfirmSignOut"
import {
    SecondaryActionsMenu,
    TriggerSecondaryActionsMenu,
} from "../components/interface/menu-secondary-actions/SecondaryActionsMenu"
import { useActiveConnectionProvider } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { userAtom } from "../state/user"

export const Route = createLazyFileRoute("/embed")({
    component: Embed,
})

const originalSetTimeout = window.setTimeout
const patchedSetTimeout: typeof setTimeout = ((...params: Parameters<typeof setTimeout>) => {
    if (getAuthState() === AuthState.Connected) return originalSetTimeout(...params)

    const [fn, delay, ...args] = params
    // Check if the delay matches Firebase's _Timeout.AUTH_EVENT
    return delay === 8000 ? originalSetTimeout(fn, 500, ...args) : originalSetTimeout(fn, delay, ...args)
}) as typeof setTimeout

function patchTimeoutOn() {
    window.setTimeout = patchedSetTimeout
}
function patchTimeoutOff() {
    window.setTimeout = originalSetTimeout
}

function signalOpen() {
    patchTimeoutOn()
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: true })
}
function signalClosed() {
    patchTimeoutOff()
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}

function Embed() {
    const location = useLocation()
    const user = useAtomValue(userAtom)
    const activeProvider = useActiveConnectionProvider()
    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = appMessageBus.on(Msgs.RequestWalletDisplay, async (screen) => {
            await waitForCondition(() => getAuthState() !== AuthState.Connecting)
            switch (screen) {
                case WalletDisplayAction.Home:
                    void navigate({ to: "/embed" })
                    signalOpen()
                    break
                case WalletDisplayAction.Send:
                    void navigate({ to: "/embed/send" })
                    signalOpen()
                    break
                case WalletDisplayAction.Open:
                    signalOpen()
                    break
                case WalletDisplayAction.Closed:
                    signalClosed()
                    break
            }
        })

        // If we initialized before the above listener is created, then and RequestWalletDisplay
        // calls will be silently lost
        void appMessageBus.emit(Msgs.IframeInit, true)
        return unsubscribe
    }, [navigate])

    async function logout() {
        void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
        await activeProvider?.disconnect()
    }

    if (!user) {
        return <ConnectModal />
    }

    return (
        <>
            <main className="flex h-screen w-screen items-stretch overflow-hidden bg-base-200">
                <div className="flex flex-col size-full items-center justify-start">
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div
                        className="flex items-center justify-center gap-2 p-1 lg:hidden size-full"
                        onClick={signalOpen}
                    >
                        <div className="relative">
                            a
                            <img
                                src={user.avatar}
                                alt={`${user.name}'s avatar`}
                                className="h-8 rounded-full"
                                // This is required to avoid google avatars from sometimes failing
                                // to load properly
                                referrerPolicy="no-referrer"
                            />
                            {activeProvider && (
                                <img
                                    src={activeProvider.icon}
                                    alt={activeProvider.name}
                                    className="h-4 rounded-full absolute bottom-0 end-0 bg-base-200"
                                />
                            )}
                        </div>
                        <p className="">{user?.ens || user?.email || user?.name}</p>
                    </div>

                    <GlobalHeader />

                    <div className="relative flex flex-col grow w-full">
                        {!location.pathname.includes("permissions") && (
                            <div className="hidden lg:flex w-full items-center justify-between gap-2 bg-base-100 p-2 border-t border-b border-neutral">
                                <UserInfo />
                                <TriggerSecondaryActionsMenu />
                            </div>
                        )}

                        <div className="hidden relative lg:flex w-full grow overflow-y-auto">
                            <Outlet />
                            {!location.pathname.includes("permissions") && (
                                <>
                                    <SecondaryActionsMenu />
                                    <DialogConfirmSignOut handleDisconnect={logout} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
