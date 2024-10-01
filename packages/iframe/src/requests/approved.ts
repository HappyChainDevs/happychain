import {
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type PopupMsgs,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import type { Client, Hash } from "viem"
import { grantPermissions } from "../services/permissions"
import { addPendingTx } from "../services/transactionHistory"
import { addWatchedAsset } from "../services/watchedAssets"
import { getChainsMap, setChains } from "../state/chains"
import { getUser } from "../state/user"
import { getWalletClient } from "../state/walletClient"
import { isAddChainParams } from "../utils/isAddChainParam"
import { sendResponse } from "./sendResponse"
import { appForSourceID } from "./utils"

/**
 * Processes requests approved by the user in the pop-up,
 * running them through a series of middleware.
 */
export function handleApprovedRequest(request: PopupMsgs[Msgs.PopupApprove]): void {
    void sendResponse(request, dispatchHandlers)
}

// exported for testing
export async function dispatchHandlers(request: PopupMsgs[Msgs.PopupApprove]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse

    switch (request.payload.method) {
        case "eth_sendTransaction": {
            const tx = await sendToWalletClient(request)
            const user = getUser()
            // add tx hash to jotai tx history atom
            if (user) addPendingTx(user.address, tx as Hash)
            return tx
        }

        case "eth_requestAccounts": {
            const user = getUser()
            if (!user) return []
            grantPermissions(app, "eth_accounts")
            return user.addresses ?? [user.address]
        }

        case "wallet_requestPermissions":
            return grantPermissions(app, request.payload.params[0])

        case "wallet_addEthereumChain": {
            const response = await sendToWalletClient(request)
            // only add chain if the request is successful
            const params: unknown = Array.isArray(request.payload.params) && request.payload.params?.[0]
            if (params && isAddChainParams(params)) {
                setChains((previous) => [...previous, params])
            }
            return response
        }

        case "wallet_switchEthereumChain": {
            const chains = getChainsMap()
            // ensure chain has already been added
            if (!chains.has(request.payload.params[0].chainId)) {
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.ChainNotRecognized)
            }
            const response = await sendToWalletClient(request)
            if ("URLSearchParams" in window) {
                const searchParams = new URLSearchParams(window.location.search)
                const chain = chains.get(request.payload.params[0].chainId)
                searchParams.set("chain", JSON.stringify(chain))
                history.replaceState(
                    history.state,
                    "",
                    `${location.origin}${location.pathname}?${searchParams.toString()}`,
                )
            }
            return response
        }

        case "wallet_watchAsset": {
            const user = getUser()
            return user ? addWatchedAsset(user.address, request.payload.params) : false
        }

        default:
            return await sendToWalletClient(request)
    }
}

async function sendToWalletClient(request: PopupMsgs[Msgs.PopupApprove]) {
    const client: Client | undefined = getWalletClient()
    if (!client) {
        throw new EIP1193DisconnectedError()
    }

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
