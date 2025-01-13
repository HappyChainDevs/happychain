import { createUUID } from "@happychain/common"
import { type ConnectionProvider, Msgs, type MsgsFromApp, WalletDisplayAction } from "@happychain/sdk-shared"
import { useMutation } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import { FirebaseErrorCode, isFirebaseError } from "#src/connections/firebase/errors.ts"
import { iframeID } from "#src/requests/utils.ts"
import { signalClosed } from "#src/utils/walletState.ts"
import happychainLogo from "../assets/happychain.png"
import { useConnectionProviders } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { DotLinearMotionBlurLoader } from "./loaders/DotLinearMotionBlurLoader"
import { Button } from "./primitives/button/Button"

export function ConnectModal() {
    return (
        <main className="h-dvh w-screen rounded-3xl px-16 py-8 flex flex-col justify-center gap-8">
            <div className="flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <img alt="HappyChain Logo" src={happychainLogo} className="mx-auto size-24 drop-shadow-lg" />
                    <p className="text-2xl font-bold">HappyChain</p>
                </div>
            </div>
            <div className="flex flex-col justify-center gap-4 max-w-md mx-auto max-h-3/4 w-full overflow-y-auto grow">
                <ConnectContent />
            </div>
        </main>
    )
}

/**
 * This is the connection request from the app. Either eth_requestAccounts
 * or wallet_requestPermissions. If the connection request was initiated from within the iframe
 * then the request will be empty as there is no pending promise app side to be resolved
 */
function useClientConnectionRequest() {
    const [clientConnectionRequest, setClientConnectionRequest] = useState<null | MsgsFromApp[Msgs.ConnectRequest]>(
        null,
    )

    const clearClientConnectionRequest = useCallback(() => setClientConnectionRequest(null), [])

    useEffect(() => {
        appMessageBus.on(Msgs.ConnectRequest, (_req) => setClientConnectionRequest(_req))
    }, [])

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

    return { clientConnectionRequest, clearClientConnectionRequest }
}

const ConnectContent = () => {
    const [popupBlocked, setPopupBlocked] = useState(false)
    const providers = useConnectionProviders()
    const { clientConnectionRequest, clearClientConnectionRequest } = useClientConnectionRequest()

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
            if (isFirebaseError(_error, FirebaseErrorCode.PopupBlocked)) {
                return setPopupBlocked(true)
            }

            if (_error && !isFirebaseError(_error, FirebaseErrorCode.PopupClosed)) {
                // unknown error, just log it.
                return console.error(_error)
            }

            // iframe-originated requests won't need any response to be emitted
            if (!response) return

            void appMessageBus.emit(Msgs.ConnectResponse, response)
            clearClientConnectionRequest()
        },
    })

    if (popupBlocked) {
        return <PopupBlockedWarning onConfirm={() => setPopupBlocked(false)} />
    }

    if (mutationLogin.isPending) {
        return (
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
        )
    }

    return (
        <div className="flex flex-col gap-4 max-h-3/4 w-full overflow-auto">
            {providers.map((prov) => {
                return (
                    <Button intent="secondary" type="button" key={prov.id} onClick={() => mutationLogin.mutate(prov)}>
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
    )
}

const PopupBlockedWarning = ({ onConfirm }: { onConfirm: () => void }) => {
    return (
        <>
            <div className="text-center text-error">
                The popup was blocked. <br />
                Please allow popups in your browser and try again.
            </div>
            <Button intent={"secondary"} onClick={onConfirm}>
                Ok!
            </Button>
        </>
    )
}
