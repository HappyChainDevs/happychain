import { AuthState, type ConnectionProvider, Msgs, type MsgsFromApp } from "@happychain/sdk-shared"
import clsx from "clsx"
import { useCallback, useEffect, useState } from "react"
import { useConnect } from "wagmi"
import happychainLogo from "../assets/happychain.png"
import { useConnectionProviders } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { setAuthState } from "../state/authState"

function setModalState({ isOpen, cancelled }: Parameters<typeof appMessageBus.emit<Msgs.ModalToggle>>[1]) {
    void appMessageBus.emit(Msgs.ModalToggle, { isOpen, cancelled })
}

export function ConnectModal() {
    const providers = useConnectionProviders()
    const { connectAsync, connectors } = useConnect()
    const [req, setReq] = useState<null | MsgsFromApp[Msgs.ConnectRequest]>(null)

    useEffect(() => {
        return appMessageBus.on(Msgs.ConnectRequest, (_req) => {
            setReq(_req)
            setModalState({ isOpen: true, cancelled: false })
        })
    }, [])

    const login = useCallback(
        async (provider: ConnectionProvider) => {
            if (!req) return setModalState({ isOpen: false, cancelled: false })
            setAuthState(AuthState.Connecting)
            // pass requested args (eth_requestAccounts, wallet_requestPermissions) so we can get correct response, not just 'login'
            const { response, request } = await provider.connect(req)
            await connectAsync({ connector: connectors[0] })
            void appMessageBus.emit(Msgs.ConnectResponse, { request, response })
            setModalState({ isOpen: false, cancelled: false })
        },
        [req, connectAsync, connectors],
    )

    const abort = useCallback(() => {
        if (req) void appMessageBus.emit(Msgs.ConnectResponse, { request: req, response: null })
        setModalState({ isOpen: false, cancelled: true })
    }, [req])

    return (
        <>
            <main className="h-dvh w-screen rounded-xl overflow-hidden">
                <div
                    onClick={abort}
                    onKeyDown={abort}
                    className={clsx(
                        "fixed left-0 right-0 top-0 h-dvh",
                        "flex items-center justify-center",
                        "bg-slate-900/50 backdrop-blur-sm",
                        "transition duration-0 lg:duration-300 opacity-0 lg:opacity-100",
                    )}
                >
                    <div
                        className="flex gap-4 rounded-md bg-zinc-100 p-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <img alt="HappyChain Logo" src={happychainLogo} className="mx-auto h-24 w-24" />
                                <p className="text-2xl font-bold">HappyChain</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            {providers.map((prov) => {
                                return (
                                    <button
                                        type="button"
                                        key={prov.id}
                                        onClick={() => login(prov)}
                                        className="flex w-full items-center gap-4 bg-zinc-200 px-4 py-2 shadow-md transition hover:scale-[103%] hover:bg-white focus:shadow active:scale-[95%]"
                                    >
                                        <img className="h-8 w-8" src={prov.icon} alt={`${prov.name} icon`} />
                                        {prov.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
