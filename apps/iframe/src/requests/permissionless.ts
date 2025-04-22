import { HappyMethodNames, PermissionNames } from "@happy.tech/common"
import {
    type Boop,
    EntryPointStatus,
    StateRequestStatus,
    state as boopState,
    estimateGas,
} from "@happy.tech/submitter-client"
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
import { entryPoint, happyPaymaster } from "#src/constants/contracts"
import { boopReceiptsCache } from "#src/services/boopsReceiptsCache.ts"
import { getBoopAccount } from "#src/state/boopAccount"
import { getCurrentChain } from "#src/state/chains"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { getUser } from "#src/state/user"
import type { AppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation"
import { formatBoopReceiptToTransactionReceipt, formatTransaction, getCurrentNonce, sendBoop } from "./boop"
import { getSessionKeyForTarget } from "./extensions/session-keys/helpers"
import { sendResponse } from "./sendResponse"
import { appForSourceID, checkAuthenticated } from "./utils"

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

            const sessionKey = getSessionKeyForTarget(user.address, target)

            if (!sessionKey) throw new EIP1193UnauthorizedError()
            return await sendBoop({
                boopAccount: user.address,
                tx,
                signer: async (boopHash: Hash) => {
                    const account = privateKeyToAccount(sessionKey)
                    return (await account.signMessage({
                        message: { raw: boopHash },
                    })) as Hex
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
            const cachedTx = boopReceiptsCache.get(hash)
            if (cachedTx) {
                const receipt = cachedTx.receipt
                const tx = cachedTx.tx
                return formatTransaction(hash, receipt, tx)
            }

            try {
                const stateResult = await boopState({ hash })

                if (stateResult.isErr() || stateResult.value.status !== StateRequestStatus.Success) {
                    return await sendToPublicClient(app, request)
                }

                const state = stateResult.value.state

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
                boopReceiptsCache.put(hash, { receipt: state.receipt })
                return formatTransaction(hash, receipt)
            } catch (_err) {
                return await sendToPublicClient(app, request)
            }
        }

        case "eth_getTransactionReceipt": {
            const [hash] = request.payload.params
            const cachedTx = boopReceiptsCache.get(hash)

            if (cachedTx) {
                return formatBoopReceiptToTransactionReceipt(hash, cachedTx.receipt)
            }

            try {
                const stateResult = await boopState({ hash })
                if (stateResult.isErr() || stateResult.value.status !== StateRequestStatus.Success) {
                    return await sendToPublicClient(app, request)
                }

                const state = stateResult.value.state
                if (!state.included || !state.receipt) {
                    // Transaction is not yet included, return null (according to Ethereum JSON-RPC specs)
                    return null
                }

                const receipt = state.receipt

                boopReceiptsCache.put(hash, {
                    receipt,
                })
                return formatBoopReceiptToTransactionReceipt(hash, receipt)
            } catch (_err) {
                return sendToPublicClient(app, request)
            }
        }

        case "eth_getTransactionCount": {
            const [address] = request.payload.params
            const boopAccount = await getBoopAccount()
            if (boopAccount && address.toLowerCase() === boopAccount.address.toLowerCase()) {
                const nonceTrack = 0n
                return await getCurrentNonce(address as Address, nonceTrack)
            }
            throw new InvalidAddressError({ address })
        }

        case "eth_estimateGas": {
            const [tx] = request.payload.params
            const boopAccount = await getBoopAccount()
            try {
                if (!boopAccount) throw new Error("Boop account not initialized")

                const nonceTrack = 0n // Default nonce track
                const nonceValue = await getCurrentNonce(boopAccount.address, nonceTrack)

                const boop: Boop = {
                    account: boopAccount.address,
                    dest: tx.to as Address,
                    nonceTrack,
                    nonceValue,
                    value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                    payer: happyPaymaster,
                    callData: tx.data || ("0x" as Hex),
                    validatorData: "0x" as Hex,
                    extraData: "0x" as Hex,
                    gasLimit: 0n,
                    validateGasLimit: 0n,
                    executeGasLimit: 0n,
                    validatePaymentGasLimit: 0n,
                    maxFeePerGas: 0n,
                    submitterFee: 0n,
                }

                const simulateResult = await estimateGas({
                    entryPoint,
                    tx: boop,
                })

                if (simulateResult.isErr() || simulateResult.value.status !== EntryPointStatus.Success) {
                    return await sendToPublicClient(app, request)
                }

                return simulateResult.value.executeGasLimit
            } catch (error) {
                console.error("Encountered error while estimating gas:", error)
                return await sendToPublicClient(app, request)
            }
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
            const sessionKey = getSessionKeyForTarget(user!.address, targetContractAddress)
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
