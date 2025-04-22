import { HappyMethodNames, PermissionNames } from "@happy.tech/common"
import {
    type Boop,
    EntryPointStatus,
    StateRequestStatus,
    state as boopState,
    estimateGas,
} from "@happy.tech/submitter-client"
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
import {
    type Address,
    type Client,
    type Hash,
    type Hex,
    InvalidAddressError,
    type Transaction,
    hexToBigInt,
    isAddress,
    zeroAddress,
} from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { entryPoint } from "#src/constants/contracts"
import { boopReceiptsCache } from "#src/services/boopsReceiptsCache.ts"
import { StorageKey, storage } from "#src/services/storage"
import { getBoopAccount } from "#src/state/boopAccount"
import { getChains, setChains, setCurrentChain } from "#src/state/chains"
import { getInjectedClient } from "#src/state/injectedClient"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { getPermissions, grantPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { getWalletClient } from "#src/state/walletClient"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation"
import { isAddChainParams } from "#src/utils/isAddChainParam"
import { getUser } from "../state/user"
import type { AppURL } from "../utils/appURL"
import { formatBoopReceiptToTransactionReceipt, formatTransaction, getCurrentNonce, sendBoop } from "./boop"
import {
    checkIsSessionKeyExtensionInstalled,
    installSessionKeyExtension,
    registerSessionKey,
} from "./extensions/session-keys/helpers"
import { hasExistingSessionKeys } from "./extensions/session-keys/helpers"
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

        case "eth_call": {
            return await sendToPublicClient(app, request)
        }

        // This is the same as approved.ts ;
        // @todo - move common handlers to requests/shared.ts
        case "eth_sendTransaction": {
            try {
                if (!user) throw new EIP1193UnauthorizedError()
                const tx = request.payload.params[0]
                return await sendBoop({
                    boopAccount: user.address,
                    tx,
                    signer: async (boopHash: Hash) => {
                        const walletClient = getWalletClient()
                        if (!walletClient) throw new Error("Wallet client not initialized")

                        return (await walletClient.signMessage({
                            account: walletClient.account!,
                            message: { raw: boopHash },
                        })) as Hex
                    },
                })
            } catch (error) {
                console.error("Error processing transaction:", error)
                throw error
            }
        }

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
                    // If we can't get the status or it's not successful, fall back to injected client
                    return await sendToInjectedClient(app, request)
                }

                const state = stateResult.value.state

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

                boopReceiptsCache.put(hash, { receipt: state.receipt })
                const receipt = state.receipt

                return formatTransaction(hash, receipt)
            } catch (_err) {
                // Fallback to regular transaction lookup if anything fails
                return await sendToInjectedClient(app, request)
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
                return sendToInjectedClient(app, request)
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
                    payer: zeroAddress as Address, //@todo - replace zeroAddress with env variable ?
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
                    return await sendToInjectedClient(app, request)
                }

                return simulateResult.value.executeGasLimit
            } catch (error) {
                console.error("Error estimating gas:", error)
                return await sendToInjectedClient(app, request)
            }
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

            // Get the Boop account address
            const boopAccount = await getBoopAccount()
            if (!boopAccount) throw new Error("Boop account not initialized")

            // Only check extension installation if we don't have any session keys stored
            if (!hasExistingSessionKeys(user.address)) {
                const isSessionKeyValidatorInstalled = await checkIsSessionKeyExtensionInstalled(boopAccount.address)
                if (!isSessionKeyValidatorInstalled) {
                    // Install the SessionKeyValidator extension on the Boop account
                    const hash = await installSessionKeyExtension(boopAccount.address)

                    // Wait for the installation transaction to be confirmed
                    const publicClient = getPublicClient()
                    await publicClient.waitForTransactionReceipt({ hash })
                }
            }

            // Register the session key for the target contract
            const hash = await registerSessionKey(accountSessionKey.address, targetContract, user.address)

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

            return [user.address]
        }

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

            // Some wallets (Metamask, Rabby, ...) automatically switch to the newly-added chain.
            // Normalize behavior by always switching.
            // This usually does not result in an additional prompt in auto-switching wallets.
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
    const client: Client = getPublicClient()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
