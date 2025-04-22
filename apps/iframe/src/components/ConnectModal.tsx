import { createUUID } from "@happy.tech/common"
import { type ConnectionProvider, Msgs, type MsgsFromApp, WalletDisplayAction } from "@happy.tech/wallet-common"
import { useMutation } from "@tanstack/react-query"
import { cx } from "class-variance-authority"
import { useCallback, useEffect, useState } from "react"
import { FirebaseErrorCode, isFirebaseError } from "#src/connections/firebase/errors.ts"
import { iframeID } from "#src/requests/utils.ts"
import { patchTimeoutOff, signalClosed } from "#src/utils/walletState.ts"
import happychainLogo from "../assets/happychain.png"
import { useConnectionProviders } from "../connections/initialize"
import { appMessageBus } from "../services/eventBus"
import { DotLinearMotionBlurLoader } from "./loaders/DotLinearMotionBlurLoader"
import { Button } from "./primitives/button/Button"

export function ConnectModal() {
    return (
        <main className="h-dvh w-screen rounded-3xl overflow-hidden flex flex-col items-center justify-center">
            <div className="max-w-xs grid grid-rows-[auto_1fr] gap-6 px-2 p-4 w-full">
                <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <img alt="HappyChain Logo" src={happychainLogo} className="mx-auto size-16 drop-shadow-lg" />
                        <p className="text-xl font-bold">HappyChain</p>
                    </div>
                </div>
                <div className="grid min-h-0 max-h-[335px] gap-4">
                    <ConnectContent />
                </div>
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
        return appMessageBus.on(Msgs.ConnectRequest, (_req) => setClientConnectionRequest(_req))
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
            // popup was blocked
            if (isFirebaseError(_error, FirebaseErrorCode.PopupBlocked)) return setPopupBlocked(true)

            setPopupBlocked(false)

            // Remove timeout patch for next time in-case this is what caused the error
            if (_error) patchTimeoutOff()

            // user just closed the popup without connecting
            // Don't need to log the error
            if (_error && isFirebaseError(_error, FirebaseErrorCode.PopupClosed)) return

            // unknown error, just log it.
            if (_error) return console.error(_error)

            // iframe-originated requests won't need any response to be emitted
            if (!response) return

            void appMessageBus.emit(Msgs.ConnectResponse, response)
            clearClientConnectionRequest()
        },
    })

    if (popupBlocked || mutationLogin.isError) {
        return (
            <div className="overflow-y-auto [scrollbar-width:thin]">
                <ErrorDisplay
                    popupBlocked={popupBlocked}
                    onAccept={() => {
                        setPopupBlocked(false)
                        mutationLogin.reset()
                    }}
                />
            </div>
        )
    }

    return (
        <>
            <div className="overflow-y-auto [scrollbar-width:thin]">
                {mutationLogin.isPending ? (
                    <LoginPending provider={mutationLogin.variables} />
                ) : (
                    <ProviderList onSelect={(prov) => mutationLogin.mutate(prov)} />
                )}
            </div>
            <Button intent="ghost" type="button" className="h-fit justify-center" onClick={() => signalClosed()}>
                Close
            </Button>
        </>
    )
}

const LoginPending = ({ provider }: { provider?: ConnectionProvider }) => {
    return (
        <div className="grid gap-8">
            <div className="flex items-center justify-center gap-4">
                <img alt="HappyChain Logo" src={happychainLogo} className="h-12" />
                <DotLinearMotionBlurLoader />
                <img className="h-8" src={provider?.icon} alt={`${provider?.name} icon`} />
            </div>
            <div className="text-center flex items-center justify-center">
                Verify your {provider?.name} account to continue with HappyChain.
            </div>
        </div>
    )
}

const ProviderList = ({ onSelect }: { onSelect: (provider: ConnectionProvider) => void }) => {
    const providers = useConnectionProviders()

    return (
        <div className="grid gap-4">
            {providers.map((prov) => {
                return (
                    <Button intent="outline" type="button" key={prov.id} onClick={() => onSelect(prov)}>
                        <img
                            className={cx(
                                "h-[1.5em] object-container max-w-8",
                                prov.id === "injected:wallet.injected" && "dark:invert",
                            )}
                            src={prov.icon}
                            alt={`${prov.name} icon`}
                        />
                        <span className="grow me-8">{prov.name}</span>
                    </Button>
                )
            })}
        </div>
    )
}

const ErrorDisplay = ({ popupBlocked, onAccept }: { popupBlocked: boolean; onAccept: () => void }) => {
    return (
        <>
            {popupBlocked ? <PopupBlockedWarning /> : <GenericConnectionWarning />}
            <div className="flex items-center justify-center mt-4 ">
                <Button intent="secondary" type="button" className="w-full h-fit justify-center" onClick={onAccept}>
                    Ok
                </Button>
            </div>
        </>
    )
}

const PopupBlockedWarning = () => {
    return (
        <div
            role="alert"
            className="animate-fadeIn space-y-[1ex] text-content border-warning border rounded-lg py-[2ex] px-[1em] text-xs text-center"
        >
            <p>The popup was blocked.</p>
            <p>Please enable popups to sign in and try again.</p>
        </div>
    )
}

const GenericConnectionWarning = () => {
    return (
        <div
            role="alert"
            className="animate-fadeIn space-y-[1ex] text-content border-warning border rounded-lg py-[2ex] px-[1em] text-xs text-center"
        >
            <p>Unable to set up your account and complete login.</p>
            <p>Please check your connection and try signing in again.</p>
        </div>
    )
}
