import { createUUID } from "@happychain/common"
import { type ConnectionProvider, ModalStates, Msgs, type MsgsFromApp } from "@happychain/sdk-shared"
import { useMutation } from "@tanstack/react-query"
import { cx } from "class-variance-authority"
import { useEffect, useState } from "react"
import { useConnect } from "wagmi"
import { iframeID } from "#src/requests/utils.ts"
import happychainLogo from "../assets/happychain.png"
import { useConnectionProviders } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { Button } from "./primitives/button/Button"

export function ConnectModal() {
    const providers = useConnectionProviders()
    const { connectAsync, connectors } = useConnect()

    /**
     * This is the connection request from the app. Either eth_requestAccounts
     * or wallet_requestPermissions. If the connection request was initiated from within the iframe
     * then the request will be empty as there is no pending promise app side to be resolved
     */
    const [clientConnectionRequest, setClientConnectionRequest] = useState<null | MsgsFromApp[Msgs.ConnectRequest]>(
        null,
    )

    useEffect(() => appMessageBus.on(Msgs.ConnectRequest, (_req) => setClientConnectionRequest(_req)), [])

    useEffect(() => {
        return appMessageBus.on(Msgs.RequestDisplay, (screen) => {
            switch (screen) {
                case ModalStates.Closed:
                    if (clientConnectionRequest) {
                        void appMessageBus.emit(Msgs.ConnectResponse, {
                            request: clientConnectionRequest,
                            response: null,
                        })
                    }
                    break
            }
        })
    }, [clientConnectionRequest])

    const mutationLogin = useMutation({
        mutationFn: async (provider: ConnectionProvider) => {
            // if no dapp-request exists here, we will initiate a new one
            const connectRequest = clientConnectionRequest ?? {
                key: createUUID(),
                windowId: iframeID(),
                error: null,
                payload: { method: "eth_requestAccounts" },
            }

            const { response, request } = await provider.connect(connectRequest)

            await connectAsync({ connector: connectors[0] })

            return clientConnectionRequest ? { response, request } : undefined
        },
        onSettled(data, _error) {
            // iframe-originated requests won't need any response to be emitted
            if (!data) return
            void appMessageBus.emit(Msgs.ConnectResponse, data)
            setClientConnectionRequest(null)
        },
    })

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
                            <Button
                                intent="secondary"
                                type="button"
                                key={prov.id}
                                onClick={() => mutationLogin.mutate(prov)}
                            >
                                <img
                                    className={cx(
                                        "size-8",
                                        mutationLogin.isPending &&
                                            mutationLogin.variables?.id !== prov.id &&
                                            "grayscale",
                                    )}
                                    src={prov.icon}
                                    alt={`${prov.name} icon`}
                                />
                                <div className="grow mr-8">{prov.name}</div>
                            </Button>
                        )
                    })}
                </div>
            </main>
        </>
    )
}
