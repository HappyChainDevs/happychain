import { createUUID } from "@happychain/common"
import { AuthState, type ConnectionProvider, Msgs, type MsgsFromApp } from "@happychain/sdk-shared"
import { cx } from "class-variance-authority"
import { useCallback, useEffect, useState } from "react"
import { useConnect } from "wagmi"
import { iframeID } from "#src/requests/utils.ts"
import happychainLogo from "../assets/happychain.png"
import { useConnectionProviders } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { setAuthState } from "../state/authState"
import { Button } from "./primitives/button/Button"

function setModalState({ isOpen, cancelled }: Parameters<typeof appMessageBus.emit<Msgs.ModalToggle>>[1]) {
    void appMessageBus.emit(Msgs.ModalToggle, { isOpen, cancelled })
}

export function ConnectModal() {
    const providers = useConnectionProviders()
    const { connectAsync, connectors } = useConnect()
    const [loadingProvider, setLoadingProvider] = useState<string>("")
    const [req, setReq] = useState<null | MsgsFromApp[Msgs.ConnectRequest]>(null)

    useEffect(() => {
        return appMessageBus.on(Msgs.ConnectRequest, (_req) => {
            setReq(_req)
            setModalState({ isOpen: true, cancelled: false })
        })
    }, [])

    const login = useCallback(
        async (provider: ConnectionProvider) => {
            // if no dapp-request exists here, we will initiate a new one
            const connectRequest = req ?? {
                key: createUUID(),
                windowId: iframeID(),
                error: null,
                payload: { method: "eth_requestAccounts" },
            }

            setAuthState(AuthState.Connecting)
            try {
                // pass requested args (eth_requestAccounts, wallet_requestPermissions) so we can get correct response, not just 'login'
                setLoadingProvider(provider.id)
                const { response, request } = await provider.connect(connectRequest)
                await connectAsync({ connector: connectors[0] })
                if (req) {
                    // mirror back to dapp
                    void appMessageBus.emit(Msgs.ConnectResponse, { request, response })
                }
                setModalState({ isOpen: false, cancelled: false })
            } finally {
                setLoadingProvider("")
            }
        },
        [req, connectAsync, connectors],
    )

    return (
        <>
            <main className="h-dvh w-screen rounded-3xl px-16 py-8 flex flex-col justify-around">
                <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <img alt="HappyChain Logo" src={happychainLogo} className="mx-auto size-24 drop-shadow-lg" />
                        <p className="text-2xl font-bold">HappyChain</p>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    {providers.map((prov) => {
                        return (
                            <Button intent="secondary" type="button" key={prov.id} onClick={() => login(prov)}>
                                <img
                                    className={cx(
                                        "size-8",
                                        loadingProvider && loadingProvider !== prov.id && "grayscale",
                                    )}
                                    src={prov.icon}
                                    alt={`${prov.name} icon`}
                                />
                                <div className="grow mr-8">
                                    {prov.name} {loadingProvider === prov.id}
                                </div>
                            </Button>
                        )
                    })}
                </div>
            </main>
        </>
    )
}
