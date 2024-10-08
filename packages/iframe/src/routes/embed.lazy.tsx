import { AuthState, Msgs } from "@happychain/sdk-shared"
import { Outlet, createLazyFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useEffect, useMemo } from "react"
import { ConnectModal } from "../components/ConnectModal"
import { DotLinearMotionBlurLoader } from "../components/loaders/DotLinearMotionBlurLoader"
import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { appMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"

import { ModalStates } from "@happychain/sdk-shared"
import { Power } from "@phosphor-icons/react"
import clsx from "clsx"
import GlobalHeader from "../components/interface/GlobalHeader"
import UserInfo from "../components/interface/UserInfo"
import { userAtom } from "../state/user"

export const Route = createLazyFileRoute("/embed")({
    component: Embed,
})

function signalOpen() {
    void appMessageBus.emit(Msgs.ModalToggle, { isOpen: true, cancelled: false })
}

function Embed() {
    const authState = useAtomValue(authStateAtom)
    const user = useAtomValue(userAtom)

    const navigate = useNavigate()

    const location = useLocation()

    const web3Providers = useInjectedProviders()
    const socialProviders = useSocialProviders()

    useEffect(() => {
        return appMessageBus.on(Msgs.RequestDisplay, (screen) => {
            switch (screen) {
                case ModalStates.Login:
                    navigate({ to: "/embed" })
                    signalOpen()
                    break
                case ModalStates.Send:
                    navigate({ to: "/embed/send" })
                    signalOpen()
                    break
            }
        })
    }, [navigate])

    const activeProvider = useMemo(
        () => socialProviders.concat(web3Providers).find((a) => user && a.id === `${user.type}:${user.provider}`),
        [user, socialProviders, web3Providers],
    )

    async function disconnect() {
        await activeProvider?.disable()
        appMessageBus.emit(Msgs.ModalToggle, { isOpen: false, cancelled: false })
    }

    if (authState === AuthState.Connecting) {
        return (
            <main className="h-screen w-screen flex items-center justify-center">
                <DotLinearMotionBlurLoader />
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
                <div className={clsx("w-full h-full flex-col items-center justify-start flex")}>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div
                        className="flex items-center justify-center gap-2 p-1 lg:hidden w-full h-full"
                        onClick={signalOpen}
                    >
                        <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-8 rounded-full" />
                        <p className="">{user?.ens || user?.email || user?.name}</p>
                    </div>

                    <GlobalHeader />
                    <div className="hidden lg:flex w-full items-center justify-between gap-2 bg-slate-200 p-2 border-t border-b border-black">
                        <UserInfo user={user} />
                        {location.pathname === "/embed" && (
                            <button className="w-6 h-6 rounded-xl" onClick={disconnect} type="button">
                                <Power size={22} />
                            </button>
                        )}
                    </div>
                    <div className="hidden lg:flex w-full grow overflow-y-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </>
    )
}
