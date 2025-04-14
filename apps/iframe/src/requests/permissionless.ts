import { FIFOCache, HappyMethodNames, PermissionNames } from "@happy.tech/common"
import {
    type EIP1193RequestResult,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    type Msgs,
    type ProviderMsgsFromApp,
    requestPayloadIsHappyMethod,
} from "@happy.tech/wallet-common"
import {
    type Address,
    type Client,
    type Hash,
    type Hex,
    InvalidAddressError,
    type Transaction,
    hexToBigInt,
    isAddress,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { type SessionKeysByHappyUser, StorageKey, storage } from "#src/services/storage.ts"
import { getBoopAccount } from "#src/state/boopAccount"
import { getBoopClient, getNonce } from "#src/state/boopClient"
import { getCurrentChain } from "#src/state/chains"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { getUser } from "#src/state/user"
import type { AppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation"
import { formatBoopReceiptToTransactionReceipt, formatTransactionFromBoopReceipt, sendBoop } from "./boop"
import { signWithSessionKey } from "./modules/session-keys/helpers"
import { sendResponse } from "./sendResponse"
import { appForSourceID, checkAuthenticated } from "./utils"
import { type HappyTx, type HappyTxReceipt, StateRequestStatus, EntryPointStatus } from "@happy.tech/submitter-client"

/** Cache Boop receipts - store both the receipt and the original transaction */
export const boopReceiptCache = new FIFOCache<Hash, { receipt: HappyTxReceipt; tx: HappyTx }>(100)

/**
 * Processes requests that do not require user confirmation, running them through a series of
 * middleware.
 */
export function handlePermissionlessRequest(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    void sendResponse(request, dispatchHandlers)
}

// exported for testing
export async function dispatchHandlers(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse

    switch (request.payload.method) {
        case "eth_chainId": {
            const currChain = getCurrentChain().chainId
            return currChain ?? (await sendToPublicClient(app, { ...request, payload: request.payload }))
        }

        case "eth_sendTransaction": {
            const user = getUser()
            if (!user) throw new EIP1193UnauthorizedError()
            const tx = request.payload.params[0]
            const target = request.payload.params[0].to
            if (!tx || !target) return false

            const permissions = getPermissions(app, {
                [PermissionNames.SESSION_KEY]: { target },
            })
            if (permissions.length === 0) throw new EIP1193UnauthorizedError()

            const sessionKey = storage.get(StorageKey.SessionKeys)?.[user.address]?.[target]
            if (!sessionKey) throw new EIP1193UnauthorizedError()
            return await sendBoop({
                user,
                tx,
                signer: async (boop) => {
                    return await signWithSessionKey(sessionKey, boop)
                },
            })
        }

        case "eth_accounts": {
            const user = getUser()
            return user && hasPermissions(app, "eth_accounts") ? [user.address] : []
        }

        case HappyMethodNames.USER: {
            const user = getUser()
            return user && hasPermissions(app, "eth_accounts") ? getUser() : undefined
        }

        case "eth_requestAccounts":
            checkAuthenticated()
            if (!hasPermissions(app, "eth_accounts")) {
                throw new EIP1193UserRejectedRequestError()
            }
            return isAddress(`${getUser()?.address}`) ? [getUser()?.address] : []

        case "eth_getTransactionByHash": {
            const [hash] = request.payload.params
            const boopClient = await getBoopClient()

            if (!boopClient) {
                return await sendToPublicClient(app, request)
            }

            const cachedTx = boopReceiptCache.get(hash)
            if (cachedTx) {
                const receipt = cachedTx.receipt
                const tx = cachedTx.tx

                return formatTransactionFromBoopReceipt(hash, receipt, tx)
            }

            try {
                const statusResult = await boopClient.boop.getStatus(hash)

                if (statusResult.isErr() || statusResult.value.status !== StateRequestStatus.Success) {
                    return await sendToPublicClient(app, request)
                }

                const state = statusResult.value.state

                if (!state.included || !state.receipt) {
                    const boopAccount = await getBoopAccount()
                    if (!boopAccount) return await sendToPublicClient(app, request)

                    return {
                        hash,
                        from: boopAccount.address,
                        nonce: 0x0,
                        blockHash: null,
                        blockNumber: null,
                        transactionIndex: null,
                        input: "0x",
                    } as Partial<Transaction>
                }

                const receipt = state.receipt

                // We don't have the original transaction details, just the receipt
                // So we'll work with what we have
                return formatTransactionFromBoopReceipt(hash, receipt)
            } catch (_err) {
                return await sendToPublicClient(app, request)
            }
        }

        case "eth_getTransactionReceipt": {
            const [hash] = request.payload.params
            const boopClient = await getBoopClient()

            if (!boopClient) {
                return await sendToPublicClient(app, request)
            }

            // First, check cached boops to avoid unnecessary call
            const cachedTx = boopReceiptCache.get(hash)
            if (cachedTx) {
                return formatBoopReceiptToTransactionReceipt(hash, cachedTx.receipt)
            }

            // If not in cache, get the receipt from the submitter
            try {
                const statusResult = await boopClient.boop.getStatus(hash)

                if (statusResult.isErr() || statusResult.value.status !== StateRequestStatus.Success) {
                    return await sendToPublicClient(app, request)
                }

                const state = statusResult.value.state
                if (!state.included || !state.receipt) {
                    // Transaction is not yet included, return null (according to Ethereum JSON-RPC specs)
                    return null
                }

                const receipt = state.receipt

                boopReceiptCache.put(hash, {
                    receipt,
                    tx: null as unknown as HappyTx,
                })
                return formatBoopReceiptToTransactionReceipt(hash, receipt)
            } catch (_err) {
                return sendToPublicClient(app, request)
            }
        }

        case "eth_getTransactionCount": {
            const [address] = request.payload.params
            const boopClient = await getBoopClient()
            const boopAccount = await getBoopAccount()

            if (boopClient && boopAccount && address.toLowerCase() === boopAccount.address.toLowerCase()) {
                // In Boop, nonces are stored per account and nonce track in the EntryPoint
                const nonceTrack = 0n // Default nonce track

                try {
                    return await getNonce(address as Address, nonceTrack)
                } catch (error) {
                    console.error("Encountered error while fetching nonce:", error)
                    throw error
                }
            }

            return await sendToPublicClient(app, request)
        }

        case "eth_estimateGas": {
            const [tx] = request.payload.params
            const boopClient = await getBoopClient()

            if (boopClient) {
                try {
                    const boop = await boopClient.boop.prepareTransaction({
                        dest: tx.to as Address,
                        callData: tx.data || "0x",
                        value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                    })

                    const estimateResult = await boopClient.boop.estimateGas(boop)

                    if (estimateResult.isErr() || estimateResult.value.status !== EntryPointStatus.Success) {
                        return await sendToPublicClient(app, request)
                    }

                    const gasLimit = estimateResult.value.executeGasLimit
                    return `0x${gasLimit.toString(16)}`
                } catch (error) {
                    console.error("Encountered error while estimating gas:", error)
                    return await sendToPublicClient(app, request)
                }
            }
            return await sendToPublicClient(app, request)
        }

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

        case "wallet_addEthereumChain":
            // If this is permissionless, the chain already exists, so we simply succeed.
            return null

        case "wallet_switchEthereumChain":
            // If this is permissionless, we're already on the right chain so we simply succeed.
            return null

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            const user = getUser()
            const targetContractAddress = request.payload.params[0] as Address

            if (!isAddress(targetContractAddress)) {
                throw new InvalidAddressError({ address: targetContractAddress })
            }

            if (
                !hasPermissions(app, {
                    [PermissionNames.SESSION_KEY]: {
                        target: targetContractAddress,
                    },
                })
            ) {
                throw new EIP1193UnauthorizedError()
            }

            // Retrieve the stored session key for this user and target contract
            const storedSessionKeys = storage.get(StorageKey.SessionKeys) as SessionKeysByHappyUser
            const sessionKey = storedSessionKeys?.[user!.address]?.[targetContractAddress]

            if (!sessionKey) {
                throw new Error("Session key not found")
            }

            // Return the public address associated with this session key
            return privateKeyToAccount(sessionKey).address
        }

        default:
            return await sendToPublicClient(app, request)
    }
}

async function sendToPublicClient<T extends ProviderMsgsFromApp[Msgs.RequestPermissionless]>(
    app: AppURL,
    request: T,
): Promise<EIP1193RequestResult<T["payload"]["method"]>> {
    if (checkIfRequestRequiresConfirmation(app, request.payload)) {
        throw new EIP1193UnauthorizedError()
    }
    const client: Client = getPublicClient()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
