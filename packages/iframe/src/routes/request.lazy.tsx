import { HappyMethodNames } from "@happychain/common"
import { Msgs, type PopupMsgs } from "@happychain/sdk-shared"
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

function Request() {
    const [isLoading, setIsLoading] = useState(false)
    const { args, key, windowId, iframeIndex } = Route.useSearch()
    const req = JSON.parse(atob(args))

    function reject() {
        void window.opener.frames[iframeIndex].postMessage({
            scope: "server:popup",
            type: Msgs.PopupReject,
            payload: {
                error: {
                    code: 4001,
                    message: "User rejected request",
                    data: "User rejected request",
                },
                windowId,
                key,
                payload: null,
            },
        })
    }

    function accept(payload: PopupMsgs[Msgs.PopupApprove]["payload"]) {
        setIsLoading(true)
        void window.opener.frames[iframeIndex].postMessage({
            scope: "server:popup",
            type: Msgs.PopupApprove,
            payload: {
                error: null,
                windowId,
                key,
                payload: payload,
            },
        })
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
