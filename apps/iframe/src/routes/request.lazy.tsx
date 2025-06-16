import { decodeUrlSafeBase64 } from "@happy.tech/common"
import {
    EIP1193UserRejectedRequestError,
    HappyMethodNames,
    Msgs,
    type PopupMsgs,
    serializeRpcError,
} from "@happy.tech/wallet-common"
import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { Button } from "#src/components/primitives/button/Button.tsx"
import { HappyLoadAbi } from "#src/components/requests/HappyLoadAbi"
import { HappyRequestSessionKey } from "#src/components/requests/HappyRequestSessionKey"
import { UnknownRequest } from "#src/components/requests/UnknownRequest.tsx"
import { getUser, setUser, userAtom } from "#src/state/user"
import { DotLinearWaveLoader } from "../components/loaders/DotLinearWaveLoader"
import { EthRequestAccounts } from "../components/requests/EthRequestAccounts"
import { EthSendTransaction } from "../components/requests/EthSendTransaction"
import { PersonalSign } from "../components/requests/PersonalSign"
import { WalletAddEthereumChain } from "../components/requests/WalletAddEthereumChain"
import { WalletRequestPermissions } from "../components/requests/WalletRequestPermissions"
import { WalletSwitchEthereumChain } from "../components/requests/WalletSwitchEthereumChain"
import { WalletWatchAsset } from "../components/requests/WalletWatchAsset"
import type { requestLabels } from "../constants/requestLabels"

// wallet and popup are on the same domain. This is used to filter message events
const targetOrigin = window.location.origin
// The opener is the window that opened this popup, could be the wallet, or the connected dapp
const opener = window.opener as Window | null

/**
 * Global listener for the requests popup. This exists here to handle messages that may be passed
 * outside the scope of the react lifecycle, such as the popup needing to close itself, or
 * the user getting synced from local storage
 */
window.addEventListener("message", (msg) => {
    if (msg.origin !== targetOrigin) return
    try {
        const { payload, type } = msg.data
        switch (type) {
            case Msgs.ClosePopup: {
                window.close()
                return
            }
            case Msgs.RespondCurrentUser: {
                // Only set the received user if local storage is empty
                // this can occur due to browser environments restricting
                // via state partitioning. Avoid setting unconditionally
                // to reduce unnecessary re-renders
                if (!getUser() && payload) setUser(payload)
                return
            }
        }
    } catch {}
})

export const Route = createLazyFileRoute("/request")({
    component: Request,
})

function Request() {
    useSyncedUser()
    const { isLoading, isError, ...props } = useRequestActions()

    // This can occur if sending a transaction from within the wallet (such as the send page)
    // and the user has popups blocked. If instead of allowing popups, they choose to just open this
    // one popup, but leave the rest blocked, window.opener is null and we can't post the response
    // back to the wallet to finalize the transaction.
    if (!opener) return <MissingOpenerError />
    if (isError) return <RequestSendError />
    if (isLoading) return <Loader />

    switch (props.method as keyof typeof requestLabels) {
        case "personal_sign":
            return <PersonalSign {...props} />
        case "wallet_sendTransaction":
        case "eth_sendTransaction":
            return <EthSendTransaction {...props} />
        case "wallet_switchEthereumChain":
            return <WalletSwitchEthereumChain {...props} />
        case "wallet_addEthereumChain":
            return <WalletAddEthereumChain {...props} />
        case "wallet_requestPermissions":
            return <WalletRequestPermissions {...props} />
        case "eth_requestAccounts":
            return <EthRequestAccounts {...props} />
        case "wallet_watchAsset":
            return <WalletWatchAsset {...props} />
        case HappyMethodNames.LOAD_ABI:
            return <HappyLoadAbi {...props} />
        case HappyMethodNames.REQUEST_SESSION_KEY:
            return <HappyRequestSessionKey {...props} />
        default:
            return <UnknownRequest {...props} />
    }
}

function Loader() {
    return (
        <div className="flex h-dvh w-full items-center justify-center">
            <DotLinearWaveLoader />
        </div>
    )
}

function MissingOpenerError() {
    return (
        <div className="flex flex-col gap-4 h-dvh w-full items-center justify-center p-8 text-xl">
            Failed to load request. Please make sure to allow all popups, then close this window and try again.
            <div>
                <ForceCloseButton />
            </div>
        </div>
    )
}

function RequestSendError() {
    return (
        <div className="flex flex-col gap-4 h-dvh w-full items-center justify-center">
            <div className="text-xl">Failed to make request. Please close this window and try again.</div>
            <div>
                <ForceCloseButton />
            </div>
        </div>
    )
}

function ForceCloseButton() {
    return (
        <Button onClick={() => window.close()} intent="outline-negative" className="text-base-content justify-center">
            Close
        </Button>
    )
}

type PopupSendMessageType = Msgs.PopupApprove | Msgs.PopupReject | Msgs.RequestCurrentUser

function getFrameByIndex(index: number) {
    if (!opener) throw new Error("No opener found. Can not reach iframe")
    if (index === -1) return opener
    if (index >= 0 && index < opener.frames.length) return opener.frames[index]
    throw new Error("Failed to validate frame index")
}

/**
 * Custom hook to send messages to the iframe
 */
function useSendIframeMessage() {
    const { key, windowId, iframeIndex } = Route.useSearch()
    const send = useCallback(
        <T extends PopupSendMessageType>(type: T, payload: Omit<PopupMsgs[T], "key" | "windowId">) => {
            try {
                const frame = getFrameByIndex(iframeIndex)
                frame.postMessage({ scope: "server:popup", type, payload: { ...payload, key, windowId } }, targetOrigin)
                return { success: true }
            } catch {
                return { success: false }
            }
        },
        [key, windowId, iframeIndex],
    )
    return { send }
}

/**
 * Hook to automatically reject the user request when the popup is manually closed.
 * Returns an unsubscribe listener so that when approved, the listener can be removed,
 * and the request will no longer get rejected on close (which should happen automatically).
 */
function useAutoRejectOnClose() {
    const { send } = useSendIframeMessage()

    const unloadHandler = useCallback(() => {
        send(Msgs.PopupReject, {
            error: serializeRpcError(new EIP1193UserRejectedRequestError()),
            payload: null,
        })
    }, [send])

    useEffect(() => {
        window.addEventListener("beforeunload", unloadHandler)
        return () => window.removeEventListener("beforeunload", unloadHandler)
    }, [unloadHandler])

    return { unsubscribeCloseListener: () => window.removeEventListener("beforeunload", unloadHandler) }
}

/**
 * Requests the iframe to sync the user from local storage.
 * This is useful for when the user is not set in local storage, such as when running
 * in a stricter browser environment where local storage is partitioned, specifically iOS.
 *
 * See the global message listener at the top of the file for how the response is received.
 */
function useSyncedUser() {
    const user = useAtomValue(userAtom)
    const { send } = useSendIframeMessage()
    useEffect(() => {
        // if the user is set, we don't need to do anything
        if (user) return
        send(Msgs.RequestCurrentUser, { error: null, payload: null })
    }, [user, send])
}

/**
 * Custom hook to handle request actions in the popup.
 *
 * isLoading is set to true when the request is approved, and never set to false again,
 * with the assumption being that the popup will be closed when its processed by the wallet.
 *
 * method and params are parsed from the URL arguments, which are base64 encoded.
 *
 * accept, and reject are functions to signal to the wallet the users intent.
 */
function useRequestActions() {
    const [isLoading, setIsLoading] = useState(false)
    const [isError, setIsError] = useState(false)
    const { unsubscribeCloseListener } = useAutoRejectOnClose()
    const { args } = Route.useSearch()
    const { send } = useSendIframeMessage()
    const { method, params } = decodeUrlSafeBase64(args)
    const reject = useCallback(() => window.close(), [])
    const accept = useCallback(
        (payload: PopupMsgs[Msgs.PopupApprove]["payload"]) => {
            unsubscribeCloseListener()
            setIsLoading(true)
            const { success } = send(Msgs.PopupApprove, { error: null, payload })
            setIsError(!success)
        },
        [unsubscribeCloseListener, send],
    )

    return { isLoading, isError, method, params, reject, accept }
}
