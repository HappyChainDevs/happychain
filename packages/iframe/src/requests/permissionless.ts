import { FIFOCache, HappyMethodNames, PermissionNames, TransactionType } from "@happychain/common"
import { deployment as contractAddresses } from "@happychain/contracts/account-abstraction/sepolia"
import {
    type EIP1193RequestResult,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    type Msgs,
    type ProviderMsgsFromApp,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import { decodeNonce } from "permissionless"
import {
    type Address,
    type Client,
    type Hash,
    InvalidAddressError,
    type Transaction,
    type TransactionReceipt,
    hexToBigInt,
    isAddress,
    parseSignature,
} from "viem"
import {
    type GetUserOperationReturnType,
    type UserOperation,
    type UserOperationReceipt,
    getUserOperationHash,
} from "viem/account-abstraction"
import { entryPoint07Address } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { parseUserOpCalldata, sendUserOp } from "#src/requests/userOps"
import { type SessionKeysByHappyUser, StorageKey, storage } from "#src/services/storage.ts"
import { getCurrentChain } from "#src/state/chains"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
import { getUser } from "#src/state/user"
import { getWalletClient } from "#src/state/walletClient"
import type { AppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation"
import { sendResponse } from "./sendResponse"
import { appForSourceID, checkAuthenticated } from "./utils"

/**
 * Processes requests that do not require user confirmation, running them through a series of
 * middleware.
 */
export function handlePermissionlessRequest(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    void sendResponse(request, dispatchHandlers)
}

/** Cache userOp receipts that we already have from pimlico_sendUserOperationNow. */
export const receiptCache = new FIFOCache<Hash, [UserOperationReceipt, GetUserOperationReturnType]>(100)

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
                    return await getWalletClient()!.signMessage({
                        account: privateKeyToAccount(sessionKey),
                        message: { raw: hash },
                    })
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
                return await sendToPublicClient(app, request)
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
                return sendToPublicClient(app, request)
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
            // The app may have bypassed the permission check, but this doesn't do anything.
            return null

        case "wallet_switchEthereumChain":
            // If this is permissionless, we're already on the right chain so we simply succeed.
            // The app may have bypassed the permission check, but this doesn't do anything.
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
