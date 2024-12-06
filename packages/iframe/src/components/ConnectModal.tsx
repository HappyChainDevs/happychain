import { createUUID } from "@happychain/common"
import { type ConnectionProvider, Msgs, type MsgsFromApp, WalletDisplayAction } from "@happychain/sdk-shared"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { iframeID } from "#src/requests/utils.ts"
import { signalClosed } from "#src/utils/walletState.ts"
import happychainLogo from "../assets/happychain.png"
import { useConnectionProviders } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { DotLinearMotionBlurLoader } from "./loaders/DotLinearMotionBlurLoader"
import { Button } from "./primitives/button/Button"

export function ConnectModal() {
    const providers = useConnectionProviders()

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
        return appMessageBus.on(Msgs.RequestWalletDisplay, (screen) => {
            switch (screen) {
                case WalletDisplayAction.Closed:
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

            return clientConnectionRequest ? { response, request } : undefined
        },
        onSettled(response, _error) {
            // iframe-originated requests won't need any response to be emitted
            if (!response) return
            void appMessageBus.emit(Msgs.ConnectResponse, response)
            setClientConnectionRequest(null)
        },
    })

    return (
        <>
            <main className="h-dvh w-screen rounded-3xl px-16 py-8 flex flex-col justify-around">
                <div className="flex min-h-1/4 items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <img alt="HappyChain Logo" src={happychainLogo} className="mx-auto size-24 drop-shadow-lg" />
                        <p className="text-2xl font-bold">HappyChain</p>
                    </div>
                </div>
                {mutationLogin.isError ? (
                    <div
                        role="alert"
                        className="animate-fadeIn space-y-[1ex] text-content border-warning border rounded-lg py-[2ex] px-[1em] text-xs text-center"
                    >
                        <p>Unable to set up your account and complete login.</p>
                        <p>Please check your connection and try signing in again.</p>
                    </div>
                ) : mutationLogin.isPending ? (
                    <div className="grid gap-8">
                        <div className="flex items-center justify-center gap-4">
                            <img alt="HappyChain Logo" src={happychainLogo} className="h-12" />
                            <DotLinearMotionBlurLoader />
                            <img
                                className="h-8"
                                src={mutationLogin.variables?.icon}
                                alt={`${mutationLogin.variables?.name} icon`}
                            />
                        </div>
                        <div className="text-center flex items-center justify-center">
                            Verify your {mutationLogin.variables?.name} account to continue with HappyChain.
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 max-h-3/4 w-full overflow-auto">
                        {providers.map((prov) => {
                            return (
                                <Button
                                    intent="secondary"
                                    type="button"
                                    key={prov.id}
                                    onClick={() => mutationLogin.mutate(prov)}
                                >
                                    <img className="h-full w-auto max-w-8" src={prov.icon} alt={`${prov.name} icon`} />
                                    <span className="grow me-8">{prov.name}</span>
                                </Button>
                            )
                        })}
                        <Button
                            intent="ghost"
                            type="button"
                            className="text-neutral-content justify-center"
                            onClick={() => signalClosed()}
                        >
                            Close
                        </Button>
                    </div>
                )}
            </main>
        </>
    )
}
