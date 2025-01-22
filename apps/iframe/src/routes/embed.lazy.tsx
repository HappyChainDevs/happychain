import { WalletDisplayAction } from "@happy.tech/wallet-common"
import { Msgs } from "@happy.tech/wallet-common"
import { Outlet, createLazyFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { signalClosed, signalOpen } from "#src/utils/walletState.ts"
import { ConnectModal } from "../components/ConnectModal"
import GlobalHeader from "../components/interface/GlobalHeader"
import UserInfo from "../components/interface/UserInfo"
import { DialogConfirmLogOut } from "../components/interface/menu-secondary-actions/DialogConfirmLogOut"
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

function Embed() {
    const location = useLocation()
    const user = useAtomValue(userAtom)
    const activeProvider = useActiveConnectionProvider()
    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = appMessageBus.on(Msgs.RequestWalletDisplay, async (screen) => {
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
                                    <DialogConfirmLogOut handleDisconnect={logout} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
