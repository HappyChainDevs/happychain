import { WalletDisplayAction } from "@happy.tech/wallet-common"
import { Msgs } from "@happy.tech/wallet-common"
import { Outlet, createLazyFileRoute, useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue } from "jotai"
import { useEffect } from "react"
import { signalClosed, signalOpen } from "#src/utils/walletState"
import { Scrollable } from "#src/v2/layouts/root/screen"
import { dialogConfirmLogOutVisibility, userDetailsCollapsibleVisibility } from "#src/v2/layouts/root/user"
import { ConnectModal } from "../components/ConnectModal"
import { appMessageBus } from "../services/eventBus"
import { userAtom } from "../state/user"

export const Route = createLazyFileRoute("/embed")({
    component: Embed,
})

function Embed() {
    const user = useAtomValue(userAtom)
    const navigate = useNavigate()
    const [, setUserDetailsVisibility] = useAtom(userDetailsCollapsibleVisibility)
    const [, setLogoutVisibility] = useAtom(dialogConfirmLogOutVisibility)

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
                    setUserDetailsVisibility(false)
                    setLogoutVisibility(false)
                    break
            }
        })

        // If we initialized before the above listener is created, then
        // RequestWalletDisplay calls will be silently lost
        void appMessageBus.emit(Msgs.IframeInit, true)
        return unsubscribe
    }, [navigate, setUserDetailsVisibility, setLogoutVisibility])

    if (!user) {
        return <ConnectModal />
    }

    return (
        <Scrollable className="pt-4">
            <Outlet />
        </Scrollable>
    )
    /*
    return (
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
                <BannerList />
                <section className="relative grid min-h-0 h-full gap-4 overflow-y-auto auto-rows-[1fr]">
                    <Outlet />
                    {!location.pathname.includes("permissions") && (
                        <>
                            <ImportTokensDialog />
                            <SecondaryActionsMenu />
                            <DialogConfirmLogOut handleDisconnect={logout} />
                        </>
                    )}
                </section>
            </div>
        </main>
        */
}
