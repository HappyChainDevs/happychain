import { HappyMethodNames, PermissionNames, TransactionType } from "@happy.tech/common"
import { deployment as contractAddresses } from "@happy.tech/contracts/account-abstraction/sepolia"
import {
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    type EIP1193RequestResult,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type ProviderMsgsFromApp,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happy.tech/wallet-common"
import { decodeNonce } from "permissionless"
import {
    type Client,
    type Hash,
    type Hex,
    InvalidAddressError,
    type Transaction,
    type TransactionReceipt,
    hexToBigInt,
    isAddress,
    parseSignature,
} from "viem"
import { entryPoint07Address } from "viem/account-abstraction"
import { type UserOperation, getUserOperationHash } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { StorageKey, storage } from "#src/services/storage.ts"
import { addPendingUserOp } from "#src/services/userOpsHistory.ts"
import { getChains, getCurrentChain, setChains, setCurrentChain } from "#src/state/chains.ts"
import { getInjectedClient } from "#src/state/injectedClient.ts"
import { loadAbiForUser } from "#src/state/loadedAbis.ts"
import { getPermissions, grantPermissions, revokePermissions } from "#src/state/permissions.ts"
import { getPublicClient } from "#src/state/publicClient.ts"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient.ts"
import { addWatchedAsset } from "#src/state/watchedAssets.ts"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation.ts"
import { isAddChainParams } from "#src/utils/isAddChainParam.ts"
import { getUser } from "../state/user"
import type { AppURL } from "../utils/appURL"
import { receiptCache } from "./permissionless"
import { sendResponse } from "./sendResponse"
import { checkIsSessionKeyModuleInstalled, installSessionKeyModule, registerSessionKey } from "./session-keys/helpers"
import { parseUserOpCalldata, sendUserOp } from "./userOps"
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

        // This is the same as approved.ts
        case "eth_sendTransaction": {
            if (!user) return false
            const target = request.payload.params[0].to

            const hasSession = getPermissions(app, {
                [PermissionNames.SESSION_KEY]: { target },
            }).some((a) => a.caveats.some((c) => c.type === "target" && c.value === target))

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
                return await sendUserOp({
                    user,
                    tx,
                    validator: contractAddresses.SessionKeyValidator,
                    signer: async (userOp, smartAccountClient) => {
                        const hash = getUserOperationHash({
                            userOperation: {
                                ...userOp,
                                sender: smartAccountClient.account.address,
                                signature: "0x",
                            } as UserOperation<"0.7">,
                            entryPointAddress: entryPoint07Address,
                            entryPointVersion: "0.7",
                            chainId: Number(getCurrentChain().chainId),
                        })
                        return await getInjectedClient()!.signMessage({
                            account: privateKeyToAccount(sessionKey),
                            message: { raw: hash },
                        })
                    },
                })
            }

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

        case "eth_getTransactionByHash": {
            const [hash] = request.payload.params
            const smartAccountClient = (await getSmartAccountClient())!

            // Attempt to retrieve UserOperation details first.
            // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
            try {
                const userOpInfo = await smartAccountClient.getUserOperation({ hash })
                const { to, value } = parseUserOpCalldata(userOpInfo.userOperation.callData)
                const { v, r, s, yParity } = parseSignature(userOpInfo.userOperation.signature)

                return {
                    // Standard transaction fields
                    blockHash: userOpInfo.blockHash,
                    blockNumber: userOpInfo.blockNumber,
                    from: userOpInfo.userOperation.sender,
                    gas: userOpInfo.userOperation.callGasLimit,
                    maxFeePerGas: userOpInfo.userOperation.maxFeePerGas,
                    maxPriorityFeePerGas: userOpInfo.userOperation.maxPriorityFeePerGas,
                    nonce: Number(userOpInfo.userOperation.nonce),
                    to,
                    hash, // hash of the userop
                    value,
                    // Normally this is the tx index for regular transactions that have been
                    // included, but is allowed to be null for pending transactions. Since we don't
                    // get the userOp index, and returning the bundler tx index (1) wouldn't be
                    // meaningfully useful and (2) would require an extra call to try to get the
                    // userOp receipt, we always return null here.
                    // If truly required, use `eth_getTransactionReceipt`.
                    transactionIndex: null,
                    accessList: [],
                    type: "eip1559",
                    typeHex: TransactionType.EIP1559,
                    v: v!, // We're always under EIP-155
                    r,
                    s,
                    yParity,
                    chainId: Number(getCurrentChain().chainId),
                    // Weird non-standard Viem extension: "Contract code or a hashed method call"
                    // We just leave this empty.
                    input: "0x",
                    // Extra field for HappyWallet-aware users
                    userOp: userOpInfo.userOperation,
                } as Transaction // performs type-check, but allows extra fields
            } catch (_err) {
                // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
                return await sendToInjectedClient(app, request)
            }
        }

        case "eth_getTransactionReceipt": {
            const [hash] = request.payload.params
            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
            // Attempt to retrieve UserOperation details first.
            // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
            try {
                const [userOpReceipt, userOpInfo] =
                    receiptCache.get(hash) ??
                    (await Promise.all([
                        smartAccountClient.getUserOperationReceipt({ hash }),
                        smartAccountClient.getUserOperation({ hash }),
                    ]))
                const { to, value } = parseUserOpCalldata(userOpInfo.userOperation.callData)
                return {
                    // Standard transaction receipt fields
                    blockHash: userOpInfo.blockHash,
                    blockNumber: userOpInfo.blockNumber,
                    contractAddress: userOpReceipt.receipt.contractAddress,
                    cumulativeGasUsed: userOpReceipt.receipt.cumulativeGasUsed,
                    effectiveGasPrice: userOpReceipt.receipt.effectiveGasPrice,
                    from: userOpInfo.userOperation.sender,
                    gasUsed: userOpReceipt.receipt.gasUsed,
                    logs: userOpReceipt.receipt.logs,
                    logsBloom: userOpReceipt.receipt.logsBloom,
                    status: userOpReceipt.success ? "success" : "reverted",
                    to,
                    transactionHash: hash, // userop hash
                    transactionIndex: userOpReceipt.receipt.transactionIndex,
                    type: userOpReceipt.receipt.type,
                    userOpReceipt, // Extra field for HappyWallet-aware users
                    value, // Extra field because why not?
                } as TransactionReceipt // performs type-check, but allows extra fields
            } catch (_err) {
                return sendToInjectedClient(app, request)
            }
        }

        case "eth_getTransactionCount": {
            const [address] = request.payload.params
            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient

            if (smartAccountClient && address.toLowerCase() === smartAccountClient.account.address.toLowerCase()) {
                /**
                 * For smart accounts, nonces combine :
                 * - A key (upper 192 bits) for custom wallet logic
                 * - A sequence number (lower 64 bits) for maintaining uniqueness
                 *
                 * @see {@link https://docs.stackup.sh/docs/useroperation-nonce} for detailed explanation
                 * @see {@link https://github.com/pimlicolabs/entrypoint-estimations/blob/main/lib/account-abstraction/contracts/interfaces/INonceManager.sol}
                 *
                 * `eth_getTransactionCount` should only return the sequence number to match
                 * traditional account behavior and maintain compatibility with existing tools.
                 */
                const fullNonce = await smartAccountClient.account.getNonce()
                const { sequence } = decodeNonce(fullNonce)
                return sequence
            }

            throw new InvalidAddressError({ address })
        }

        case "eth_estimateGas": {
            const [tx] = request.payload.params
            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
            const gasEstimation = await smartAccountClient.estimateUserOperationGas({
                calls: [
                    {
                        to: tx.to as `0x${string}`,
                        data: tx.data || "0x",
                        value: tx.value ? hexToBigInt(tx.value) : 0n,
                    },
                ],
            })

            return gasEstimation.callGasLimit
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
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
            const hasExistingSessionKeys = Boolean(storedSessionKeys[user!.address])

            const smartAccountClient = (await getSmartAccountClient())!
            let keyRegistered = false

            // Only check module installation if we don't have any session keys stored
            if (!hasExistingSessionKeys) {
                const isSessionKeyValidatorInstalled = await checkIsSessionKeyModuleInstalled(smartAccountClient)
                if (!isSessionKeyValidatorInstalled) {
                    await installSessionKeyModule(smartAccountClient, accountSessionKey.address, targetContract)
                    keyRegistered = true
                }
            }

            // It's theoreticaly possible to have the validator uninstalled when there are local
            // session keys, but if you're doing that you're looking for trouble.

            if (!keyRegistered) {
                const hash = await registerSessionKey(smartAccountClient, accountSessionKey.address, targetContract)
                await smartAccountClient.waitForUserOperationReceipt({ hash })
                keyRegistered = true
            }

            grantPermissions(app, {
                [PermissionNames.SESSION_KEY]: {
                    target: targetContract,
                },
            })

            storage.set(StorageKey.SessionKeys, {
                ...storedSessionKeys,
                [user!.address]: {
                    ...(storedSessionKeys[user!.address] || {}),
                    [targetContract]: sessionKey,
                },
            })

            return accountSessionKey.address
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
