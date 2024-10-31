import {
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type PopupMsgs,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import { type Client, type Hash, type Hex, hexToBigInt } from "viem"

import { addPendingTx } from "#src/services/transactionHistory.ts"
import { getChains, setChains } from "#src/state/chains.ts"
import { getCurrentChain, setCurrentChain } from "#src/state/currentChain.ts"
import { grantPermissions } from "#src/state/permissions.ts"
import type { PendingTxDetails } from "#src/state/txHistory.ts"
import { getUser } from "#src/state/user.ts"
import { getWalletClient } from "#src/state/walletClient.ts"
import { addWatchedAsset } from "#src/state/watchedAssets.ts"
import { isAddChainParams } from "#src/utils/isAddChainParam.ts"
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
    const user = getUser()

    switch (request.payload.method) {
        case "eth_sendTransaction": {
            if (!user) return false

            const hash = (await sendToWalletClient(request)) as Hash
            const value = hexToBigInt(request.payload.params[0].value as Hex)
            const payload: PendingTxDetails = { hash, value }
            addPendingTx(user.address, payload)

            return hash
        }

        case "eth_requestAccounts": {
            if (!user) return []
            grantPermissions(app, "eth_accounts")
            return user.addresses ?? [user.address]
        }

        case "wallet_requestPermissions":
            return grantPermissions(app, request.payload.params[0])

        case "wallet_addEthereumChain": {
            const chains = getChains()
            const params = Array.isArray(request.payload.params) && request.payload.params[0]
            const isValid = isAddChainParams(params)

            if (!isValid)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Invalid request body")

            if (params.chainId in chains)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Chain already exists")

            const response = await sendToWalletClient(request)
            // Only add chain if the request is successful.
            setChains((prev) => ({ ...prev, [params.chainId]: params }))
            return response
        }

        case "wallet_switchEthereumChain": {
            const chains = getChains()
            const chainId = request.payload.params[0].chainId

            // ensure chain has already been added
            if (!(chainId in chains)) {
                throw getEIP1193ErrorObjectFromCode(
                    EIP1193ErrorCodes.SwitchChainError,
                    "Unrecognized chain ID, try adding the chain first.",
                )
            }

            const response = await sendToWalletClient(request)

            if (chainId === getCurrentChain()?.chainId) {
                return null // correct response for a successful request
            }

            const chain = chains[chainId]
            if (chain) {
                setCurrentChain(chain)
            } else {
                console.warn("Chain not found; error in request.")
                return false
            }

            return response
        }

        case "wallet_watchAsset": {
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
