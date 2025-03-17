import { createUUID } from "@happy.tech/common"
import { Alert, Button } from "@happy.tech/uikit-react"
import { type ConnectionProvider, Msgs, type MsgsFromApp, WalletDisplayAction } from "@happy.tech/wallet-common"
import { useMutation } from "@tanstack/react-query"
import { cx } from "class-variance-authority"
import { useCallback, useEffect, useState } from "react"
import { FirebaseErrorCode, isFirebaseError } from "#src/connections/firebase/errors"
import { useConnectionProviders } from "#src/connections/initialize"
import { iframeID } from "#src/requests/utils"
import { appMessageBus } from "#src/services/eventBus"
import { signalClosed } from "#src/utils/walletState"

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
    const popupBlocked = useState(false)
    const [, setPopupBlocked] = popupBlocked
    const providers = useConnectionProviders()
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

    return {
        clientConnectionRequest,
        clearClientConnectionRequest,
        mutationLogin,
        providers,
        popupBlocked,
    }
}

interface ScreenConnectorsProps {
    list: Array<ConnectionProvider>
    handleOnRequestClientConnection: (provider: ConnectionProvider) => void
}
const ScreenConnectors = ({ list, handleOnRequestClientConnection }: ScreenConnectorsProps) => {
    return (
        <div className="row-span-full grid gap-5 grid-rows-[auto_1fr] my-auto">
            <h1 className="text-center">Connect to HappyChain</h1>
            <div className={cx("grid min-h-0 max-h-[170px] gap-3 pb-3")}>
                <div className={cx("overflow-y-auto snap-y px-8 snap-mandatory [scrollbar-width:thin]", "relative")}>
                    <div className="grid gap-4">
                        {list.map((prov) => {
                            return (
                                <div className="snap-center snap-always" key={prov.id}>
                                    <Button.Gui
                                        aspect="outline"
                                        className="w-full"
                                        type="button"
                                        onClick={() => handleOnRequestClientConnection(prov)}
                                    >
                                        <img
                                            className={cx(
                                                "size-5 object-contain",
                                                prov.id === "injected:wallet.injected" && "invert",
                                            )}
                                            src={prov.icon}
                                            alt={`${prov.name} icon`}
                                        />
                                        <span className="grow">{prov.name}</span>
                                    </Button.Gui>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            <div className="pt-1 border-t border-current/50">
                <Button.Gui
                    aspect="ghost"
                    type="button"
                    className="w-full justify-center"
                    onClick={() => signalClosed()}
                >
                    Close
                </Button.Gui>
            </div>
        </div>
    )
}

const ScreenLoginPending = ({ provider }: { provider?: ConnectionProvider }) => {
    return (
        <Alert.Gui.Root intent="info">
            <Alert.Gui.Description asChild>
                <div className="flex flex-col gap-[inherit]">
                    <div className="flex gap-8 items-center justify-center">
                        {/** would be cool to have some sort of "dial in progress" animation here */}
                        <img className="h-8" src={provider?.icon} alt={`${provider?.name} icon`} />
                        <div className="h-10 aspect-square [mask-position:center] [mask-size:contain] [mask-repeat:no-repeat] mask-icon-hds-system-gui-mascot-happychain bg-current" />
                    </div>
                    <p className="text-center flex items-center justify-center">
                        Verify your {provider?.name} account to continue with HappyChain.
                    </p>
                </div>
            </Alert.Gui.Description>
        </Alert.Gui.Root>
    )
}

const ScreenPopupBlockedWarning = () => {
    return (
        <Alert.Gui.Root intent="negative">
            <Alert.Gui.Icon />
            <Alert.Gui.Title>The popup was blocked.</Alert.Gui.Title>
            <Alert.Gui.Description>Please enable popups to sign in and try again.</Alert.Gui.Description>
        </Alert.Gui.Root>
    )
}

const ScreenGenericWarning = () => {
    return (
        <Alert.Gui.Root intent="negative">
            <Alert.Gui.Icon />
            <Alert.Gui.Title>Login failed.</Alert.Gui.Title>
            <Alert.Gui.Description>
                Unable to set up your account and complete login.
                <br />
                Please check your connection and try signing in again.
            </Alert.Gui.Description>
        </Alert.Gui.Root>
    )
}

export const ScreenSingleSignOnHappyChain = () => {
    const {
        popupBlocked: [popupBlocked],
        providers,
        mutationLogin,
    } = useClientConnectionRequest()

    // Error screens
    if (mutationLogin.isError || popupBlocked)
        return (
            <div className="row-span-full my-auto">
                {popupBlocked ? <ScreenPopupBlockedWarning /> : <ScreenGenericWarning />}
            </div>
        )

    // Pending action screen
    if (mutationLogin.isPending)
        return (
            <div className="row-span-full my-auto">
                <ScreenLoginPending provider={mutationLogin.variables} />
            </div>
        )

    return (
        <ScreenConnectors
            list={providers}
            handleOnRequestClientConnection={(provider: ConnectionProvider) => mutationLogin.mutate(provider)}
        />
    )
}
