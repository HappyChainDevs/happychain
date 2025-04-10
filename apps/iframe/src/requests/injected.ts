import { HappyMethodNames, PermissionNames, TransactionType } from "@happy.tech/common"
import {
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type ProviderMsgsFromApp,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happy.tech/wallet-common"
import { type Address, type Hash, type Hex, InvalidAddressError, type Transaction, hexToBigInt, isAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { addPendingBoop, markBoopAsConfirmed } from "#src/services/boopsHistory"
import { StorageKey, storage } from "#src/services/storage"
import { getBoopAccount } from "#src/state/boopAccount"
import { getBoopClient, getNonce } from "#src/state/boopClient"
import { getChains, getCurrentChain, setChains, setCurrentChain } from "#src/state/chains"
import { getInjectedClient } from "#src/state/injectedClient"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { getPermissions, grantPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation"
import { isAddChainParams } from "#src/utils/isAddChainParam"
import { getUser } from "../state/user"
import type { AppURL } from "../utils/appURL"
import { formatBoopReceiptToTransactionReceipt, sendBoop } from "./boop"
import {
    checkIsSessionKeyModuleInstalled,
    installSessionKeyModule,
    registerSessionKey,
    signWithSessionKey,
} from "./modules/session-keys/helpers"
import { sendResponse } from "./sendResponse"
import { appForSourceID } from "./utils"

// @todo - cleanup imports
import type { HappyTx } from "../../../../packages/submitter/lib/tmp/interface/HappyTx"
import { type HappyTxState, StateRequestStatus } from "../../../../packages/submitter/lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "../../../../packages/submitter/lib/tmp/interface/status"

// Local cache for transaction receipts to avoid repeated calls
const receiptCache = new Map<Hash, HappyTxState>()

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

        case "eth_call": {
            return await sendToPublicClient(app, request)
        }

        // This is the same as approved.ts
        case "eth_sendTransaction": {
            if (!user) return false
            const target = request.payload.params[0].to

            const hasSession = getPermissions(app, { [PermissionNames.SESSION_KEY]: { target } }).length > 0

            if (hasSession) {
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
                    signer: async (boop: HappyTx) => {
                        return await signWithSessionKey(sessionKey, boop)
                    },
                })
            }

            try {
                const boopClient = await getBoopClient()
                if (!boopClient) throw new Error("Boop client not initialized")

                const tx = request.payload.params[0]
                const result = await boopClient.boop.sendTransaction({
                    dest: tx.to as Address,
                    callData: tx.data || "0x",
                    value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                    estimateGas: true,
                })

                if (result.isErr()) {
                    throw result.error
                }

                if (result.value.status === "submitSuccess" && result.value.state.receipt) {
                    const boopHash = result.value.state.receipt.happyTxHash as Hash
                    addPendingBoop(user.address, {
                        boopHash,
                        value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                    })

                    if (result.value.state.included) {
                        markBoopAsConfirmed(user.address, tx.value ? hexToBigInt(tx.value as Hex) : 0n, result.value)
                    }

                    return boopHash
                }

                throw new Error("Failed to execute boop transaction") // @todo - use error code ?
            } catch (error) {
                console.error("Sending Boop errored", error)
                throw error
            }
        }

        case "eth_getTransactionByHash": {
            const [hash] = request.payload.params
            const boopClient = await getBoopClient()

            if (!boopClient) {
                // Fall back to injected client if no Boop client is available
                return await sendToInjectedClient(app, request)
            }

            try {
                // Get the transaction status using boop.getStatus instead of getUserOperation
                const statusResult = await boopClient.boop.getStatus(hash)

                if (statusResult.isErr() || statusResult.value.status !== StateRequestStatus.Success) {
                    // If we can't get the status or it's not successful, fall back to injected client
                    return await sendToInjectedClient(app, request)
                }

                const state = statusResult.value.state

                if (!state.included || !state.receipt) {
                    // Handle pending transaction (not yet included in a block)
                    const boopAccount = await getBoopAccount()
                    if (!boopAccount) return await sendToInjectedClient(app, request)

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

                // Cache the receipt for later use
                receiptCache.set(hash, state)
                const receipt = state.receipt
                const currentChain = getCurrentChain()

                return {
                    accessList: [],
                    blockHash: receipt.txReceipt.blockHash,
                    blockNumber: receipt.txReceipt.blockNumber,
                    chainId: Number(currentChain.chainId),
                    from: receipt.account,
                    gas: receipt.gasUsed,
                    gasPrice: receipt.txReceipt.effectiveGasPrice,
                    hash,
                    input: "0x", // @todo - should be `receipt.callData` ?
                    nonce: receipt.nonceValue.toString(),
                    to: receipt?.dest || receipt.txReceipt.to, // should be `receipt.dest` ? @todo - confirm if `dest` should be returned by the submitter or not
                    value: "0x", //  @todo - should be `receipt.value` ?
                    typeHex: TransactionType.EIP1559,
                    r: "0x0",
                    s: "0x0",
                    v: "0x0",
                    // Extra field
                    boop: receipt,
                } as unknown as Transaction
            } catch (_err) {
                // Fall back to regular transaction lookup if anything fails
                return await sendToInjectedClient(app, request)
            }
        }

        case "eth_getTransactionReceipt": {
            const [hash] = request.payload.params
            const boopClient = await getBoopClient()

            if (!boopClient) {
                return await sendToInjectedClient(app, request)
            }

            try {
                if (receiptCache.has(hash)) {
                    const cachedState = receiptCache.get(hash)
                    if (cachedState?.included && cachedState?.receipt) {
                        const receipt = cachedState.receipt
                        return formatBoopReceiptToTransactionReceipt(hash, receipt)
                    }
                }

                const statusResult = await boopClient.boop.getStatus(hash)

                if (statusResult.isErr() || statusResult.value.status !== StateRequestStatus.Success) {
                    return await sendToInjectedClient(app, request)
                }

                const state = statusResult.value.state

                if (!state.included || !state.receipt) {
                    return null
                }

                receiptCache.set(hash, state)
                return formatBoopReceiptToTransactionReceipt(hash, state.receipt)
            } catch (_err) {
                return sendToInjectedClient(app, request)
            }
        }

        case "eth_getTransactionCount": {
            const [address] = request.payload.params
            const boopClient = await getBoopClient()

            if (boopClient) {
                const boopAccount = await getBoopAccount()
                if (boopAccount && address.toLowerCase() === boopAccount.address.toLowerCase()) {
                    const nonceTrack = 0n

                    try {
                        return await getNonce(address as Address, nonceTrack)
                    } catch (error) {
                        console.error("Error fetching nonce:", error)
                        throw error
                    }
                }
            }

            return await sendToInjectedClient(app, request)
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

                    if (estimateResult.isErr()) {
                        // Fall back to injected client if estimation fails
                        return await sendToInjectedClient(app, request)
                    }

                    if (estimateResult.value.status === EntryPointStatus.Success) {
                        // Return a properly formatted hex string for gas limit
                        const gasLimit = estimateResult.value.gasLimit
                        return `0x${gasLimit.toString(16)}`
                    }

                    // Fall back if status is not Success
                    return await sendToInjectedClient(app, request)
                } catch (error) {
                    console.error("Error estimating gas:", error)
                    // Fall back to injected client
                    return await sendToInjectedClient(app, request)
                }
            }

            // Fall back to injected client
            return await sendToInjectedClient(app, request)
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            if (!user) throw new EIP1193UnauthorizedError()

            // address of contract the session key will be authorized to interact with
            const targetContract = request.payload.params[0]

            if (!isAddress(targetContract)) {
                throw new InvalidAddressError({ address: targetContract })
            }

            // Generate a new session key
            const sessionKey = generatePrivateKey()
            const accountSessionKey = privateKeyToAccount(sessionKey)

            // Check if we have any session keys stored for this account
            const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
            const hasExistingSessionKeys = Boolean(storedSessionKeys[user.address])

            // Get the Boop account address
            const boopAccount = await getBoopAccount()
            if (!boopAccount) throw new Error("Boop account not initialized")

            // Only check module installation if we don't have any session keys stored
            if (!hasExistingSessionKeys) {
                const isSessionKeyValidatorInstalled = await checkIsSessionKeyModuleInstalled(boopAccount.address)
                if (!isSessionKeyValidatorInstalled) {
                    // Install the SessionKeyValidator extension on the Boop account
                    const hash = await installSessionKeyModule(boopAccount.address)

                    // Wait for the installation transaction to be confirmed
                    const publicClient = getPublicClient()
                    await publicClient.waitForTransactionReceipt({ hash })
                }
            }

            // Register the session key for the target contract
            const hash = await registerSessionKey(boopAccount.address, accountSessionKey.address, targetContract)

            // Wait for the registration transaction to be confirmed
            const publicClient = getPublicClient()
            await publicClient.waitForTransactionReceipt({ hash })

            // Store the session key
            storage.set(StorageKey.SessionKeys, {
                ...storedSessionKeys,
                [user.address]: {
                    ...(storedSessionKeys[user.address] || {}),
                    [targetContract]: sessionKey,
                },
            })

            // Grant permissions
            grantPermissions(app, {
                [PermissionNames.SESSION_KEY]: {
                    target: targetContract,
                },
            })

            return accountSessionKey.address
        }

        case "eth_accounts": {
            // not logged in
            if (!user) return []

            let resp = await sendToInjectedClient(app, { ...request, payload: request.payload })

            // wallet not connected, we will request permissions here
            // This shouldn't happen however added as a precaution
            if (!resp.length) {
                resp = await sendToInjectedClient(app, {
                    ...request,
                    payload: {
                        method: "eth_requestAccounts",
                        params: undefined,
                    } as EIP1193RequestParameters<"eth_requestAccounts">,
                })
                if (!resp.length) return []
            }

            // wallet connected as wrong user somehow
            if (resp[0].toLowerCase() !== user.controllingAddress) return []

            grantPermissions(app, "eth_accounts")

            return [user.address]
        }

        case "eth_requestAccounts": {
            if (!user) return []
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })

            // wallet not connected, we will revoke permissions (they should already be revoked)
            if (!resp.length) {
                revokePermissions(app, "eth_accounts")
                return []
            }

            // Permissions are likely granted, but incase they are not, we can safely grant here
            // since the injected wallet itself also has the permissions granted
            grantPermissions(app, "eth_accounts")

            // substitute boopAccount
            return [user.address]
        }

        // Rest of the handlers remain mostly unchanged
        case "wallet_requestPermissions": {
            const [{ eth_accounts, ...rest }] = request.payload.params

            if (eth_accounts) {
                const injectedResponse = await sendToInjectedClient(app, {
                    ...request,
                    payload: { method: request.payload.method, params: [{ eth_accounts }] },
                })
                if (injectedResponse.length) grantPermissions(app, { eth_accounts })
            }

            if (Object.keys(rest).length) grantPermissions(app, rest)
            return getPermissions(app, request.payload.params[0])
        }

        case "wallet_revokePermissions": {
            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })
            revokePermissions(app, request.payload.params[0])
            return resp
        }

        case "wallet_addEthereumChain": {
            const params = Array.isArray(request.payload.params) && request.payload.params[0]
            const isValid = isAddChainParams(params)

            if (import.meta.env.PROD) {
                throw new Error("Adding chains is not supported in production")
            }

            if (!isValid)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Invalid request body")

            const resp = await sendToInjectedClient(app, { ...request, payload: request.payload })

            setChains((prev) => ({ ...prev, [params.chainId]: params }))

            // Normalize behavior by switching to the newly added chain
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

            if (import.meta.env.PROD) {
                throw new Error("Switching chain is not supported in production")
            }

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

        case HappyMethodNames.LOAD_ABI: {
            return user ? loadAbiForUser(user.address, request.payload.params) : false
        }

        default: {
            return await sendToInjectedClient(app, request)
        }
    }
}

async function sendToInjectedClient<T extends ProviderMsgsFromApp[Msgs.RequestInjected]>(
    _app: AppURL,
    request: T,
): Promise<EIP1193RequestResult<T["payload"]["method"]>> {
    const client = getInjectedClient()

    if (!client) throw new EIP1193DisconnectedError()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}

async function sendToPublicClient<T extends ProviderMsgsFromApp[Msgs.RequestPermissionless]>(
    app: AppURL,
    request: T,
): Promise<EIP1193RequestResult<T["payload"]["method"]>> {
    if (checkIfRequestRequiresConfirmation(app, request.payload)) {
        throw new EIP1193UnauthorizedError()
    }
    const client = getPublicClient()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
