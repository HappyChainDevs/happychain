import { AuthState, type ConnectionProvider, Msgs, type MsgsFromApp } from "@happychain/sdk-shared"
import { cx } from "class-variance-authority"
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

    return (
        <>
            <main className="h-dvh w-screen rounded-3xl px-16 py-8 flex flex-col justify-around">
                <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <img
                            alt="HappyChain Logo"
                            src={happychainLogo}
                            className="mx-auto size-24 drop-shadow-lg hover:animate-spin"
                        />
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
                                className={cx(
                                    "btn dark:btn-neutral",
                                    "flex items-center w-full gap-4 px-4 py-2",
                                    "shadow-md focus:shadow transition",
                                    "motion-safe:hover:scale-[103%] motion-safe:active:scale-[95%]",
                                )}
                            >
                                <img className="size-8" src={prov.icon} alt={`${prov.name} icon`} />
                                {prov.name}
                            </button>
                        )
                    })}
                </div>
            </main>
        </>
    )
}
