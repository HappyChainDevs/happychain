import { HappyMethodNames } from "@happychain/common"
import {
    EIP1193ErrorCodes,
    EIP1193UnauthorizedError,
    Msgs,
    type PopupMsgs,
    getEIP1193ErrorObjectFromCode,
} from "@happychain/sdk-shared"
import { createLazyFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { HappyWalletUseAbi } from "#src/components/requests/HappyWalletUseAbi"
import { DotLinearWaveLoader } from "../components/loaders/DotLinearWaveLoader"
import { EthRequestAccounts } from "../components/requests/EthRequestAccounts"
import { EthSendTransaction } from "../components/requests/EthSendTransaction"
import { PersonalSign } from "../components/requests/PersonalSign"
import { WalletAddEthereumChain } from "../components/requests/WalletAddEthereumChain"
import { WalletRequestPermissions } from "../components/requests/WalletRequestPermissions"
import { WalletSwitchEthereumChain } from "../components/requests/WalletSwitchEthereumChain"
import { WalletWatchAsset } from "../components/requests/WalletWatchAsset"
import type { requestLabels } from "../constants/requestLabels"

window.addEventListener("message", (msg) => {
    if (msg.origin !== window.location.origin) return
    if (msg.data === "request-close") window.close()
})

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

function makeMessage(type: string, payload: unknown) {
    return {
        scope: "server:popup",
        type,
        payload,
    }
}

function Request() {
    const [isLoading, setIsLoading] = useState(false)
    const { args, key, windowId, iframeIndex } = Route.useSearch()
    const req = JSON.parse(atob(args))

    function reject() {
        const frame = getFrameByIndex(iframeIndex)

        void frame.postMessage(
            makeMessage(Msgs.PopupReject, {
                error: getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest),
                windowId,
                key,
                payload: null,
            }),
            targetOrigin,
        )
    }

    function accept(payload: PopupMsgs[Msgs.PopupApprove]["payload"]) {
        setIsLoading(true)

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
    }

    if (isLoading) {
        return (
            <div className="flex h-dvh w-full items-center justify-center">
                <DotLinearWaveLoader />
            </div>
        )
    }

    switch (req.method as keyof typeof requestLabels) {
        case "personal_sign":
            return <PersonalSign method={req.method} params={req.params} reject={reject} accept={accept} />
        case "eth_sendTransaction":
            return <EthSendTransaction method={req.method} params={req.params} reject={reject} accept={accept} />
        case "wallet_switchEthereumChain":
            return <WalletSwitchEthereumChain method={req.method} params={req.params} reject={reject} accept={accept} />
        case "wallet_addEthereumChain":
            return <WalletAddEthereumChain method={req.method} params={req.params} reject={reject} accept={accept} />
        case "wallet_requestPermissions":
            return <WalletRequestPermissions method={req.method} params={req.params} reject={reject} accept={accept} />
        case "eth_requestAccounts":
            return <EthRequestAccounts method={req.method} params={req.params} reject={reject} accept={accept} />
        case "wallet_watchAsset":
            return <WalletWatchAsset method={req.method} params={req.params} reject={reject} accept={accept} />
        case HappyMethodNames.WALLET_USE_ABI_RPC_METHOD:
            return <HappyWalletUseAbi method={req.method} params={req.params} reject={reject} accept={accept} />
        default:
            return (
                <main>
                    UNKNOWN REQUEST:<pre>{JSON.stringify(req)}</pre>
                </main>
            )
    }
}
