import {
    EIP1193DisconnectedError,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type ProviderMsgsFromApp,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import type { Client } from "viem"
import { getInjectedClient } from "#src/state/injectedClient.ts"

import { getUser } from "../state/user"
import type { AppURL } from "../utils/appURL"
import { sendResponse } from "./sendResponse"
import { appForSourceID } from "./utils"

/**
 * Processes requests that do not require user confirmation, running them through a series of
 * middleware.
 */
export function handleInjectedRequest(request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    void sendResponse(request, dispatchHandlers)
}

// exported for testing
export async function dispatchHandlers(request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse
    console.log("GETTING INJECTED CLIENT", request)
    const client = getInjectedClient()
    if (!client) throw new EIP1193DisconnectedError()

    switch (request.payload.method) {
        case "happy_user": {
            const acc = await client.request({ method: "eth_accounts" })
            return acc.length ? getUser() : undefined
        }

        case "eth_requestAccounts": {
            const resp = await client.request(request.payload)
            if (resp.length) {
                // TODO: mirror permissions
                // grantPermissions(app, "eth_accounts")
            }
            return resp
        }

        case "wallet_requestPermissions": {
            const resp = await client.request(request.payload)
            if (resp.length) {
                // TODO: grant new permissions
                // grantPermissions(app, "eth_accounts")
            }
            return resp
        }

        case "wallet_revokePermissions": {
            const resp = await client.request(request.payload)
            // TODO: mirror permission revocation
            // grantPermissions(app, "eth_accounts")
            return resp
        }

        case "wallet_addEthereumChain": {
            const resp = await client.request(request.payload)
            // TODO: add chain to local chain array
            // response is null if chain is added https://eips.ethereum.org/EIPS/eip-3085
            // we can't detect if user changed details in metamask UI for example
            // so this will be unreliable. We do have the initially requested params though
            return resp
        }

        case "wallet_switchEthereumChain": {
            const resp = await client.request(request.payload)
            // TODO:
            return resp
        }

        default:
            return sendToInjectedClient(app, request)
    }
}

async function sendToInjectedClient(_app: AppURL, request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    const client: Client | undefined = getInjectedClient()
    if (!client) throw new EIP1193DisconnectedError()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
