import { createUUID } from "@happy.tech/common"
import type { ConnectionProvider, MsgsFromApp } from "@happy.tech/wallet-common"
import { Msgs, WalletDisplayAction } from "@happy.tech/wallet-common"
import { useMutation } from "@tanstack/react-query"
import { cx } from "class-variance-authority"
import { useCallback, useEffect, useState } from "react"
import { Button } from "#src/components/primitives/button/Button"
import { FirebaseErrorCode, isFirebaseError } from "#src/connections/firebase/errors"
import { useConnectionProviders } from "#src/connections/initialize"
import { useAbortController } from "#src/hooks/useAbortController"
import { appMessageBus } from "#src/services/eventBus"
import { walletID } from "#src/utils/appURL"
import { patchTimeoutOff } from "#src/utils/walletState"
import {
    CloseButton,
    ConnectErrors,
    ErrorDisplay,
    PendingProvider,
    isBusyProviderError,
    isCreateAccountError,
    isUserRejectedRequestError,
} from "./errors"

export function ConnectModal() {
    return (
        <main className="h-dvh w-screen rounded-3xl overflow-hidden flex flex-col items-center justify-start">
            <div className="max-w-xs grid grid-rows-[auto_1fr] gap-6 px-2 p-4 w-full">
                <div className="flex items-center justify-center mt-12">
                    <div className="flex flex-col items-center gap-2">
                        <img
                            alt="HappyChain Logo"
                            src="/images/happychainLogoRopeBackground.png"
                            className="mx-auto size-16 drop-shadow-lg"
                        />
                        <p className="text-xl font-bold">HappyChain</p>
                    </div>
                </div>
                <div className="grid min-h-0 max-h-[335px] h-full gap-4">
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
    const { clientConnectionRequest, clearClientConnectionRequest } = useClientConnectionRequest()
    const abort = useAbortController()

    const mutationLogin = useMutation({
        async mutationFn(provider: ConnectionProvider) {
            // if no dapp-request exists here, we will initiate a new one
            const connectRequest = clientConnectionRequest ?? {
                key: createUUID(),
                windowId: walletID(),
                error: null,
                payload: { method: "eth_requestAccounts" },
            }
            const { response, request } = await provider.connect(connectRequest, abort.signal)
            return clientConnectionRequest ? { response, request } : undefined
        },
        onError(error) {
            // User pressed "Cancel", ignore result.
            // This captures the abort controller in use when the mutation is created.
            if (abort.signal.aborted) return

            // popup was blocked
            if (isFirebaseError(error, FirebaseErrorCode.PopupBlocked)) return

            // Remove timeout patch for next time in-case this is what caused the error
            if (error) patchTimeoutOff()

            // user just closed the popup without connecting
            // Don't need to log the error
            if (isUserRejectedRequestError(error)) return

            // Failed to create happy account
            if (isCreateAccountError(error)) return

            // unknown error, just log it.
            if (error) return console.error(error)
        },
        onSuccess(response) {
            // User pressed "Cancel", ignore result.
            // This captures the abort controller in use when the mutation is created.
            if (abort.signal.aborted) return

            // iframe-originated requests won't need any response to be emitted
            if (!response) return

            void appMessageBus.emit(Msgs.ConnectResponse, response)
            clearClientConnectionRequest()
        },
    })

    const reset = () => {
        abort.reset()
        mutationLogin.reset()
    }

    if (mutationLogin.isError && isFirebaseError(mutationLogin.error, FirebaseErrorCode.PopupBlocked)) {
        return <ErrorDisplay error={ConnectErrors.PopupBlocked} onAccept={reset} />
    }
    if (mutationLogin.isError && isCreateAccountError(mutationLogin.error)) {
        return <ErrorDisplay error={ConnectErrors.CreateAccountFailed} onAccept={reset} />
    }
    if (mutationLogin.isError && isBusyProviderError(mutationLogin.error)) {
        return <ErrorDisplay error={ConnectErrors.ConnectionProviderBusy} onAccept={reset} />
    }
    if (mutationLogin.isError && !isUserRejectedRequestError(mutationLogin.error)) {
        return <ErrorDisplay error={undefined} onAccept={reset} />
    }
    if (mutationLogin.isPending) {
        return <PendingProvider provider={mutationLogin.variables} onCancel={reset} />
    }
    return (
        <>
            <div className="overflow-y-auto scrollbar-thin">
                <ProviderList onSelect={mutationLogin.mutate} />
            </div>
            <CloseButton />
        </>
    )
}

function ProviderList({ onSelect }: { onSelect: (provider: ConnectionProvider) => void }) {
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
