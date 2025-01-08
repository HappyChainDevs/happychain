import {
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    type EIP1193RequestResult,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type ProviderMsgsFromApp,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import { type Client, type Hex, hexToBigInt } from "viem"
import { addPendingTx } from "#src/services/transactionHistory.ts"
import { getChains, setChains, setCurrentChain } from "#src/state/chains.ts"
import { getInjectedClient } from "#src/state/injectedClient.ts"
import { grantPermissions, revokePermissions } from "#src/state/permissions.ts"
import type { PendingTxDetails } from "#src/state/txHistory.ts"
import { addWatchedAsset } from "#src/state/watchedAssets.ts"
import { isAddChainParams } from "#src/utils/isAddChainParam.ts"
import { getUser } from "../state/user"
import type { AppURL } from "../utils/appURL"
import { sendResponse } from "./sendResponse"
import { appForSourceID } from "./utils"

/**
 * Processes requests using the connected 'injected wallet' such as metamask. This will be the
 * locally injected wallet when in standalone-mode, or be the dapps injected wallet when embedded
 * into another application.
 */
export function handleInjectedRequest(request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    void sendResponse(request, dispatchHandlers)
}

async function dispatchHandlers(request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse
    const user = getUser()

    switch (request.payload.method) {
        case "happy_user": {
            // const acc = await client.request({ method: "eth_accounts" })
            const acc = await sendToInjectedClient(app, { ...request, payload: { method: "eth_accounts" } })
            return acc.length ? user : undefined
        }

        case "eth_sendTransaction": {
            if (!user) return false
            const hash = await sendToInjectedClient(app, { ...request, payload: request.payload })
            const value = hexToBigInt(request.payload.params[0].value as Hex)
            const payload: PendingTxDetails = { hash, value }
            addPendingTx(user.address, payload)
            return hash
        }

        case "eth_requestAccounts": {
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            if (resp.length) {
                grantPermissions(app, "eth_accounts")
            }
            return resp
        }

        case "wallet_requestPermissions": {
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            if (resp.length) {
                grantPermissions(app, "eth_accounts")
            }
            return resp
        }

        case "wallet_revokePermissions": {
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            revokePermissions(app, request.payload.params[0])
            return resp
        }

        case "wallet_addEthereumChain": {
            const params = Array.isArray(request.payload.params) && request.payload.params[0]
            const isValid = isAddChainParams(params)
            if (!isValid)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Invalid request body")

            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })

            // the response is null if chain is added https://eips.ethereum.org/EIPS/eip-3085
            // we can't detect if user changed details in metamask UI for example
            // so this will be unreliable. We do have the initially requested params though
            // so we cache this
            // https://linear.app/happychain/issue/HAPPY-211/wallet-addethereumchain-issues-with-injected-wallets
            setChains((prev) => ({ ...prev, [params.chainId]: params }))

            // Rabby and metamask both auto switch to a newly added chain
            // but its not strictly required. this will normalize the behavior,
            // as well as allowing us to properly detect if the secondary chain switch was
            // successful for not.
            // Note: this will _not_ prompt for a second confirmation unless the original chain
            // switch was declined

            await sendToInjectedClient(app, {
                ...request,
                payload: {
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: params.chainId }],
                },
            })

            setCurrentChain(params)

            return resp
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

            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            setCurrentChain(chains[chainId])
            return resp
        }

        case "wallet_watchAsset": {
            return user ? addWatchedAsset(user.address, request.payload.params) : false
        }

        default:
            return await sendToInjectedClient(app, request)
    }
}

async function sendToInjectedClient<T extends ProviderMsgsFromApp[Msgs.RequestInjected]>(
    _app: AppURL,
    request: T,
): Promise<EIP1193RequestResult<T["payload"]["method"]>> {
    const client: Client | undefined = getInjectedClient()

    if (!client) throw new EIP1193DisconnectedError()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
