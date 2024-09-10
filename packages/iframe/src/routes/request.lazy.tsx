import { useState } from "react"

import { createLazyFileRoute } from "@tanstack/react-router"

import { Msgs, type PopupMsgs } from "@happychain/sdk-shared"
import { DotLinearWaveLoader } from "../components/loaders/DotLinearWaveLoader"
import { EthRequestAccounts } from "../components/requests/EthRequestAccounts"
import { EthSendTransaction } from "../components/requests/EthSendTransaction"
import { PersonalSign } from "../components/requests/PersonalSign"
import { WalletAddEthereumChain } from "../components/requests/WalletAddEthereumChain"
import { WalletRequestPermissions } from "../components/requests/WalletRequestPermissions"
import { WalletSwitchEthereumChain } from "../components/requests/WalletSwitchEthereumChain"
import { WatchAsset } from "../components/requests/WalletWatchAsset"
import type { requestLabels } from "../constants/requestLabels"
import { popupEmitBus } from "../services/eventBus"

export const Route = createLazyFileRoute("/request")({
    component: Request,
})

function Request() {
    const [isLoading, setIsLoading] = useState(false)
    const { args, key, windowId } = Route.useSearch()
    const req = JSON.parse(atob(args))

    function reject() {
        void popupEmitBus.emit(Msgs.PopupReject, {
            error: {
                code: 4001,
                message: "User rejected request",
                data: "User rejected request",
            },
            windowId,
            key,
            payload: null,
        })
    }

    function accept(payload: PopupMsgs[Msgs.PopupApprove]["payload"]) {
        setIsLoading(true)
        void popupEmitBus.emit(Msgs.PopupApprove, {
            error: null,
            windowId,
            key,
            payload: payload,
        })
    }

    if (isLoading) {
        return <DotLinearWaveLoader />
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
            return <WatchAsset method={req.method} params={req.params} reject={reject} accept={accept} />
        default:
            return (
                <main>
                    UNKNOWN REQUEST:<pre>{JSON.stringify(req)}</pre>
                </main>
            )
    }
}
