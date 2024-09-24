import { type Msgs, type ProviderMsgsFromApp, getChainFromSearchParams } from "@happychain/sdk-shared"
import { type Client, UnauthorizedProviderError, UserRejectedRequestError } from "viem"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "../services/permissions"
import { getPublicClient } from "../state/publicClient"
import { getUser } from "../state/user"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"
import { checkAuthenticated, sendResponse } from "./utils"

/**
 * Processes requests that do not require user confirmation, running them through a series of
 * middleware.
 */
export function handlePermissionlessRequest(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    void sendResponse(request, dispatchHandlers)
}

// exported for testing
export async function dispatchHandlers(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    switch (request.payload.method) {
        case "eth_chainId": {
            const chainId = getChainFromSearchParams()?.chainId
            return chainId ?? (await sendToPublicClient(request))
        }

        case "eth_accounts":
            return hasPermissions("eth_accounts") ? getUser()?.addresses : []

        case "eth_requestAccounts":
            checkAuthenticated()
            if (!hasPermissions("eth_accounts")) {
                throw new UserRejectedRequestError(new Error("Permission not previously granted"))
            }
            return getUser()?.addresses

        case "wallet_getPermissions":
            return getAllPermissions()

        case "wallet_requestPermissions":
            checkAuthenticated()
            return hasPermissions(request.payload.params[0]) ? getPermissions(request.payload.params[0]) : []

        case "wallet_revokePermissions":
            checkAuthenticated()
            revokePermissions(request.payload.params[0])
            return []

        default:
            return sendToPublicClient(request)
    }
}

async function sendToPublicClient(data: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    if (checkIfRequestRequiresConfirmation(data.payload)) {
        throw new UnauthorizedProviderError(new Error("Not allowed"))
    }
    const client: Client = getPublicClient()
    return await client.request(data.payload)
}
