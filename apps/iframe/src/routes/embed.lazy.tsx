import { WalletDisplayAction } from "@happy.tech/wallet-common"
import { Msgs } from "@happy.tech/wallet-common"
import { Outlet, createLazyFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue } from "jotai"
import { useEffect } from "react"
import {
    dialogLogOutConfirmationVisibilityAtom,
    secondaryMenuVisibilityAtom,
} from "#src/components/interface/menu-secondary-actions/state"
import { signalClosed, signalOpen } from "#src/utils/walletState"
import { ConnectModal } from "../components/ConnectModal"
import GlobalHeader from "../components/interface/GlobalHeader"
import UserInfo from "../components/interface/UserInfo"
import { DialogConfirmLogOut } from "../components/interface/menu-secondary-actions/DialogConfirmLogOut"
import { SecondaryActionsMenu } from "../components/interface/menu-secondary-actions/SecondaryActionsMenu"
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
    const [, setSecondaryMenuVisibility] = useAtom(secondaryMenuVisibilityAtom)
    const [, setDialogLogoutVisibility] = useAtom(dialogLogOutConfirmationVisibilityAtom)

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
                    setSecondaryMenuVisibility(false)
                    setDialogLogoutVisibility(false)
                    break
            }
        })

        // If we initialized before the above listener is created, then and RequestWalletDisplay
        // calls will be silently lost
        void appMessageBus.emit(Msgs.IframeInit, true)
        return unsubscribe
    }, [navigate, setSecondaryMenuVisibility, setDialogLogoutVisibility])

    async function logout() {
        setSecondaryMenuVisibility(false)
        setDialogLogoutVisibility(false)
        void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
        await activeProvider?.disconnect()
    }

    if (!user) {
        return <ConnectModal />
    }
    return (
        <>
            <main className="h-dvh w-screen rounded-3xl overflow-hidden flex flex-col">
                <div className="flex flex-col gap-2 size-full">
                    <GlobalHeader />
                    {!location.pathname.includes("permissions") && (
                        <section className="w-full max-w-prose mx-auto">
                            <div className="hidden relative h-fit lg:flex w-fit mx-auto gap-2">
                                <div className="text-[0.825rem] flex px-2 max-w-prose mx-auto gap-2">
                                    <UserInfo />
                                </div>
                            </div>
                        </section>
                    )}
                    <section className="relative grid min-h-0 h-full gap-4 overflow-y-auto auto-rows-[1fr]">
                        <Outlet />
                        {!location.pathname.includes("permissions") && (
                            <>
                                <SecondaryActionsMenu />
                                <DialogConfirmLogOut handleDisconnect={logout} />
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    )
}
