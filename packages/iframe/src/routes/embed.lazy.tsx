import { AuthState, Msgs } from "@happychain/sdk-shared"
import { ModalStates } from "@happychain/sdk-shared"
import { Outlet, createLazyFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import clsx from "clsx"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { useDisconnect } from "wagmi"
import { ConnectModal } from "../components/ConnectModal"
import GlobalHeader from "../components/interface/GlobalHeader"
import UserInfo from "../components/interface/UserInfo"
import { DialogConfirmSignOut } from "../components/interface/menu-secondary-actions/DialogConfirmSignOut"
import {
    SecondaryActionsMenu,
    TriggerSecondaryActionsMenu,
} from "../components/interface/menu-secondary-actions/SecondaryActionsMenu"
import { DotLinearMotionBlurLoader } from "../components/loaders/DotLinearMotionBlurLoader"
import { useActiveConnectionProvider } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"
import { userAtom } from "../state/user"

export const Route = createLazyFileRoute("/embed")({
    component: Embed,
})

function signalOpen() {
    void appMessageBus.emit(Msgs.ModalToggle, { isOpen: true, cancelled: false })
}

function Embed() {
    const location = useLocation()
    const authState = useAtomValue(authStateAtom)
    const user = useAtomValue(userAtom)
    const { disconnectAsync } = useDisconnect()
    const activeProvider = useActiveConnectionProvider()
    const navigate = useNavigate()

    useEffect(() => {
        return appMessageBus.on(Msgs.RequestDisplay, (screen) => {
            switch (screen) {
                case ModalStates.Login:
                    void navigate({ to: "/embed" })
                    signalOpen()
                    break
                case ModalStates.Send:
                    void navigate({ to: "/embed/send" })
                    signalOpen()
                    break
            }
        })
    }, [navigate])

    async function logout() {
        void appMessageBus.emit(Msgs.ModalToggle, { isOpen: false, cancelled: false })
        await disconnectAsync()
        await activeProvider?.disconnect()
    }

    if (authState === AuthState.Connecting) {
        return (
            <main className="h-screen w-screen flex items-center justify-center">
                <div className="top-4 right-4 absolute">
                    <DotLinearMotionBlurLoader />
                </div>
            </main>
        )
    }

    if (!user) {
        return <ConnectModal />
    }

    return (
        <>
            <main
                className={clsx(
                    "flex h-screen w-screen items-stretch",
                    "overflow-hidden",
                    "rounded-xl border border-black bg-base-200",
                )}
            >
                <div className={clsx("flex flex-col w-full h-full items-center justify-start")}>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div
                        className="flex items-center justify-center gap-2 p-1 lg:hidden w-full h-full"
                        onClick={signalOpen}
                    >
                        <div className="relative">
                            a
                            <img
                                src={user.avatar}
                                alt={`${user.name}'s avatar`}
                                className="h-8 rounded-full"
                                referrerPolicy="no-referrer"
                            />
                            {activeProvider && (
                                <img
                                    src={activeProvider.icon}
                                    alt={activeProvider.name}
                                    className="h-4 rounded-full absolute bottom-0 right-0 bg-white"
                                />
                            )}
                        </div>
                        <p className="">{user?.ens || user?.email || user?.name}</p>
                    </div>

                    <GlobalHeader />
                    <div className="relative flex flex-col grow w-full">
                        {!location.pathname.includes("permissions") && (
                            <div className="hidden lg:flex w-full items-center justify-between gap-2 bg-slate-200 p-2 border-t border-b border-black">
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
