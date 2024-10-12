import {
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    type Msgs,
    type ProviderMsgsFromApp,
    getChainFromSearchParams,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import type { Client } from "viem"
import {
    type PermissionAccessOptions,
    getAllPermissions,
    getPermissions,
    hasPermissions,
    revokePermissions,
} from "../services/permissions"
import { getPublicClient } from "../state/publicClient"
import { getUser } from "../state/user"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"
import { checkAuthenticated, originForSourceID, sendResponse } from "./utils"

/**
 * Processes requests that do not require user confirmation, running them through a series of
 * middleware.
 */
export function handlePermissionlessRequest(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    void sendResponse(request, dispatchHandlers)
}

// exported for testing
export async function dispatchHandlers(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    const origin = originForSourceID(request.windowId)
    const options: PermissionAccessOptions = { origin }
    if (!origin) {
        console.warn("Unsupported request source", request.windowId)
    }

    switch (request.payload.method) {
        case "eth_chainId": {
            const chainId = getChainFromSearchParams()?.chainId
            return chainId ?? (await sendToPublicClient(request))
        }

        case "eth_accounts":
            return hasPermissions("eth_accounts", options) ? getUser()?.addresses : []

        case "happy_user":
            return hasPermissions("eth_accounts", options) ? getUser() : undefined

        case "eth_requestAccounts":
            checkAuthenticated()
            if (!hasPermissions("eth_accounts", options)) {
                throw new EIP1193UserRejectedRequestError()
            }
            return getUser()?.addresses

        case "wallet_getPermissions":
            return getAllPermissions()

        case "wallet_requestPermissions": {
            checkAuthenticated()
            const permissions = request.payload.params[0]
            // TODO change getPermissions
            return hasPermissions(permissions, options) ? getPermissions(permissions) : []
        }

        case "wallet_revokePermissions":
            checkAuthenticated()
            revokePermissions(request.payload.params[0])
            return []

        default:
            return sendToPublicClient(request)
    }
}

async function sendToPublicClient(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    if (checkIfRequestRequiresConfirmation(request.payload)) {
        throw new EIP1193UnauthorizedError()
    }
    const client: Client = getPublicClient()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
