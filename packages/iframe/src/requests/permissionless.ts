import {
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    type Msgs,
    type ProviderMsgsFromApp,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import type { Client } from "viem"
import { getCurrentChain } from "#src/state/currentChain.ts"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "#src/state/permissions.ts"
import { getPublicClient } from "../state/publicClient"
import { getUser } from "../state/user"
import type { AppURL } from "../utils/appURL"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"
// import { sendResponse } from "./sendResponse"
import { appForSourceID, checkAuthenticated } from "./utils"

/**
 * Processes requests that do not require user confirmation, running them through a series of
 * middleware.
 */
export function handlePermissionlessRequest(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    void import("./sendResponse").then((a) => a.sendResponse(request, dispatchHandlers))
}

// exported for testing
export async function dispatchHandlers(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse
    switch (request.payload.method) {
        case "eth_chainId": {
            const currChain = getCurrentChain().chainId
            return currChain ?? (await sendToPublicClient(app, request))
        }
        case "eth_accounts": {
            const user = getUser()
            return user && hasPermissions(app, "eth_accounts") ? user.addresses : []
        }
        case "happy_user":
            return hasPermissions(app, "eth_accounts") ? getUser() : undefined
        case "eth_requestAccounts":
            checkAuthenticated()
            if (!hasPermissions(app, "eth_accounts")) {
                throw new EIP1193UserRejectedRequestError()
            }
            return getUser()?.addresses
        case "wallet_getPermissions":
            return getAllPermissions(app)
        case "wallet_requestPermissions": {
            checkAuthenticated()
            const permissions = request.payload.params[0]
            return hasPermissions(app, permissions) ? getPermissions(app, permissions) : []
        }
        case "wallet_revokePermissions":
            checkAuthenticated()
            revokePermissions(app, request.payload.params[0])
            return []
        default:
            return sendToPublicClient(app, request)
    }
}

async function sendToPublicClient(app: AppURL, request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    if (checkIfRequestRequiresConfirmation(app, request.payload)) {
        throw new EIP1193UnauthorizedError()
    }
    const client: Client = getPublicClient()
    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }
    return await client.request(request.payload)
}
