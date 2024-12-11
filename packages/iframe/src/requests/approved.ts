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

import { WALLET_USE_ABI_RPC_METHOD } from "@happychain/common"
import { addPendingTx } from "#src/services/transactionHistory"
import { getChains, setChains } from "#src/state/chains"
import { getCurrentChain, setCurrentChain } from "#src/state/chains"
import { grantPermissions } from "#src/state/permissions"
import { addAbi } from "#src/state/recordedAbis"
import type { PendingTxDetails } from "#src/state/txHistory"
import { getUser } from "#src/state/user"
import { getWalletClient } from "#src/state/walletClient"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { isAddChainParams } from "#src/utils/isAddChainParam"
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
    if (!user) {
        console.warn("Request approved, but no user found")
    }

    switch (request.payload.method) {
        case "eth_sendTransaction": {
            if (!user) return false

            const hash = (await sendToWalletClient(request)) as Hash

            const value = request.payload.params[0].value ? hexToBigInt(request.payload.params[0].value as Hex) : 0n

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

            if (chainId === getCurrentChain()?.chainId) return null // correct response for a successful request

            const response = await sendToWalletClient(request)
            // Currently this fails: web3Auth is hardcoded to the default intial chain.
            setCurrentChain(chains[chainId])
            return response
        }

        case "wallet_watchAsset": {
            return user ? addWatchedAsset(user.address, request.payload.params) : false
        }

        case WALLET_USE_ABI_RPC_METHOD: {
            return addAbi(request.payload.params)
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
