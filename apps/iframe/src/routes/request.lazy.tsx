import { HappyMethodNames, decodeUrlSafeBase64 } from "@happy.tech/common"
import { EIP1193UserRejectedRequestError, Msgs, type PopupMsgs, serializeRpcError } from "@happy.tech/wallet-common"
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"
import { HappyLoadAbi } from "#src/components/requests/HappyLoadAbi"
import { HappyRequestSessionKey } from "#src/components/requests/HappyRequestSessionKey"
import { UnknownRequest } from "#src/components/requests/UnknownRequest.tsx"
import { EthRequestAccounts } from "../components/requests/EthRequestAccounts"
import { EthSendTransaction } from "../components/requests/EthSendTransaction"
import { PersonalSign } from "../components/requests/PersonalSign"
import { WalletAddEthereumChain } from "../components/requests/WalletAddEthereumChain"
import { WalletRequestPermissions } from "../components/requests/WalletRequestPermissions"
import { WalletSwitchEthereumChain } from "../components/requests/WalletSwitchEthereumChain"
import { WalletWatchAsset } from "../components/requests/WalletWatchAsset"
import type { requestLabels } from "../constants/requestLabels"

export const Route = createLazyFileRoute("/request")({
    component: Request,
})

// Iframe and popup are on the same domain
const { origin: targetOrigin } = window.location
const { opener } = window

function getFrameByIndex(index: number) {
    if (index === -1) return opener
    if (index >= 0 && index < opener.frames.length) return opener.frames[index]
    throw new Error("Failed to validate frame index")
}

function makeMessage(type: string, payload: PopupMsgs[Msgs.PopupApprove | Msgs.PopupReject]) {
    return {
        scope: "server:popup",
        type,
        payload,
    }
}

function Request() {
    const { args, key, windowId, iframeIndex } = Route.useSearch()
    const req = decodeUrlSafeBase64(args)
    const navigate = useNavigate()
    const [queue, setQueue] = useState<string[]>([])

    const closeOrNext = useCallback(
        (msg: MessageEvent) => {
            if (msg.origin !== window.location.origin) return
            if (msg.data === "request-end") {
                if (!queue.length) {
                    window.close()
                } else {
                    const next = queue[0]
                    setQueue((q) => q.slice(1))
                    navigate({ to: next, replace: true })
                }
            }
        },
        [queue, navigate],
    )

    useEffect(() => {
        window.addEventListener("message", closeOrNext)
        return () => window.removeEventListener("message", closeOrNext)
    }, [closeOrNext])

    useEffect(() => {
        const cb = (msg: MessageEvent) => {
            try {
                const parsed = JSON.parse(msg.data)
                if (
                    parsed.event === "request-queue" &&
                    typeof parsed.queue === "string" &&
                    parsed.queue.startsWith(window.location.origin)
                ) {
                    setQueue((q) => q.concat(parsed.queue.replace(window.location.origin, "")))
                }
            } catch {}
        }
        window.addEventListener("message", cb)
        return () => window.removeEventListener("message", cb)
    }, [])

    const unloadHandler = useCallback(() => {
        const frame = getFrameByIndex(iframeIndex)

        void frame.postMessage(
            makeMessage(Msgs.PopupReject, {
                error: serializeRpcError(new EIP1193UserRejectedRequestError()),
                windowId,
                key,
                payload: null,
            }),
            targetOrigin,
        )
    }, [windowId, key, iframeIndex])

    useEffect(() => {
        window.addEventListener("beforeunload", unloadHandler)
        return () => window.removeEventListener("beforeunload", unloadHandler)
    }, [unloadHandler])

    const reject = useCallback(() => {
        if (!queue.length) {
            window.close()
        } else {
            const next = queue[0]
            setQueue((q) => q.slice(1))
            navigate({ to: next, replace: true })
        }
    }, [queue, navigate])

    const accept = useCallback(
        (payload: PopupMsgs[Msgs.PopupApprove]["payload"]) => {
            window.removeEventListener("beforeunload", unloadHandler)

            const frame = getFrameByIndex(iframeIndex)

            void frame.postMessage(
                makeMessage(Msgs.PopupApprove, {
                    error: null,
                    windowId,
                    key,
                    payload: payload,
                }),
                targetOrigin,
            )
        },
        [unloadHandler, windowId, key, iframeIndex],
    )

    // This can occur if sending a transaction from within the wallet (such as the send page)
    // and the user has popups blocked. If instead of allowing popups, they choose to just open this
    // one popup, but leave the rest blocked, window.opener is null and we can't post the response
    // back to the wallet to finalize the transaction.
    if (!opener) {
        return (
            <div className="flex h-dvh w-full items-center justify-center p-8 text-xl">
                Failed to load request. Please make sure to allow all popups, then close this window and try again.
            </div>
        )
    }

    const props = {
        requestCount: queue.length,
        method: req.method,
        params: req.params,
        reject,
        accept,
    }

    switch (req.method as keyof typeof requestLabels) {
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
