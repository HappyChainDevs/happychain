import { HappyMethodNames } from "@happychain/common"
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
import { type Client, type Hash, type Hex, hexToBigInt } from "viem"
import { addPendingUserOp } from "#src/services/userOpsHistory.ts"
import { getChains, setChains, setCurrentChain } from "#src/state/chains.ts"
import { getInjectedClient } from "#src/state/injectedClient.ts"
import { loadAbiForUser } from "#src/state/loadedAbis.ts"
import { grantPermissions, revokePermissions } from "#src/state/permissions.ts"
import { getSmartAccountClient } from "#src/state/smartAccountClient.ts"
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
        // Different from permissionless.ts as this actually calls the provider
        // to ensure we still have a connection with the extension wallet
        case HappyMethodNames.USER: {
            const acc = await sendToInjectedClient(app, { ...request, payload: { method: "eth_accounts" } })
            return acc.length ? user : undefined
        }

        // This is the same as approved.ts
        case "eth_sendTransaction": {
            if (!user) return false

            // TODO This try statement should go away, it's only here to surface errors
            //      that occured in the old convertToUserOp call and were being swallowed.
            //      We need to make sure all errors are correctly surfaced!
            try {
                const smartAccountClient = (await getSmartAccountClient())!
                const tx = request.payload.params[0]
                const preparedUserOp = await smartAccountClient.prepareUserOperation({
                    account: smartAccountClient.account,
                    calls: [
                        {
                            to: tx.to,
                            data: tx.data,
                            value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                        },
                    ],
                })
                // need to manually call signUserOp here since the permissionless.js and Web3Auth combination
                // doesn't support automatic signing
                const userOpSignature = await smartAccountClient.account.signUserOperation(preparedUserOp)
                const userOpWithSig = { ...preparedUserOp, signature: userOpSignature }
                const userOpHash = await smartAccountClient.sendUserOperation(userOpWithSig)

                addPendingUserOp(user.address, {
                    userOpHash: userOpHash as Hash,
                    value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                })
                return userOpHash
            } catch (error) {
                console.error("Sending UserOp errored", error)
                throw error
            }
        }

        // different from approved.ts and permissionless as we don't checkAuthenticated here,
        // instead relying on the extension wallet to handle the permission access.
        // If the call is successful, we will grant (mirror) permissions here, otherwise we
        // can safely assume it failed, and ignore.
        case "eth_requestAccounts": {
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            if (resp.length) {
                grantPermissions(app, "eth_accounts")
            }
            return resp
        }

        // same explanation as 'eth_requestAccounts' above, we won't do any checks ourselves
        // and instead rely on success/fail of the extension wallet call
        case "wallet_requestPermissions": {
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            if (resp.length) {
                grantPermissions(app, "eth_accounts")
            }
            return resp
        }

        // same as above, however, 'wallet_revokePermissions' is only in permissionless.ts, not
        // on approved.ts
        case "wallet_revokePermissions": {
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            revokePermissions(app, request.payload.params[0])
            return resp
        }

        // We can reduce the number of checks here compared to approved.ts and permissionless.ts
        // as we can rely on the extension wallet response to determine how we should mirror
        // accordingly. Some extensions automatically switch chain after adding, so we enforce this
        // behavior to have a more standard experience regardless of the connecting wallet.
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

        // same as approved.ts
        case "wallet_watchAsset": {
            return user ? addWatchedAsset(user.address, request.payload.params) : false
        }

        // same as approved.ts
        case HappyMethodNames.USE_ABI: {
            return user ? loadAbiForUser(user.address, request.payload.params) : false
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
