import { HappyMethodNames, PermissionNames } from "@happychain/common"
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
import { type Address, type Client, InvalidAddressError, decodeAbiParameters, hexToBigInt, isAddress } from "viem"
import { type UserOperation, getUserOperationHash } from "viem/account-abstraction"
import { entryPoint07Address } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { sendUserOp } from "#src/requests/userOps"
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

// exported for testing
export async function dispatchHandlers(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse

    const user = getUser()
    if (!user) {
        console.warn("Request approved, but no user found")
    }

    switch (request.payload.method) {
        case "eth_chainId": {
            const currChain = getCurrentChain().chainId
            return currChain ?? (await sendToPublicClient(app, { ...request, payload: request.payload }))
        }

        case "eth_sendTransaction": {
            if (!user) return false // TODO is this ok?
            const tx = request.payload.params[0]
            const target = request.payload.params[0].to
            if (!tx || !target) return false

            const permissions = getPermissions(app, {
                [PermissionNames.SESSION_KEY]: { target },
            })
            if (permissions.length === 0) throw new EIP1193UnauthorizedError()

            // TODO ensure null session key cannot be added
            const sessionKey = storage.get(StorageKey.SessionKeys)?.[user.address][target]
            if (!sessionKey) throw new EIP1193UnauthorizedError()

            return await sendUserOp(user, tx, async (userOp, smartAccountClient) => {
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
            })
        }

        case "eth_accounts": {
            return user && hasPermissions(app, "eth_accounts") ? [user.address] : []
        }

        case HappyMethodNames.USER: {
            return user && hasPermissions(app, "eth_accounts") ? user : undefined
        }

        case "eth_requestAccounts":
            checkAuthenticated()
            if (!hasPermissions(app, "eth_accounts")) {
                throw new EIP1193UserRejectedRequestError()
            }
            return isAddress(`${user?.address}`) ? [user?.address] : []

        case "eth_getTransactionReceipt": {
            const [hash] = request.payload.params
            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
            // Attempt to retrieve UserOperation details first.
            // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
            try {
                const userOpReceipt = await smartAccountClient.getUserOperationReceipt({ hash })
                const userOpInfo = await smartAccountClient.getUserOperation({ hash })

                const { callData, sender } = userOpInfo.userOperation

                /**
                 * Smart account transactions have 2 nested layers of data that we need to decode :
                 *
                 * 1. First layer (execute function) :
                 *    The outer wrapper is a call to the `execute()` function (selector: `0xe9ae5c53`)
                 *    We decode this to get :
                 *    - `execMode`: how to execute the wrapped call
                 *    - `executeParamsData`: parameters for the wrapped call
                 *
                 * 2. Second layer (target call) :
                 *    Inside `executeParamsData`, we find the information of the wrapped call (to, value, data).
                 *
                 * @see {@link https://docs.stackup.sh/docs/useroperation-calldata} for additional explanation
                 * @see {@link https://eips.ethereum.org/EIPS/eip-4337#definitions} for the EIP-4337 specification
                 */

                // 1. Decode the `execute()` function parameters
                const [, executionCalldata] = decodeAbiParameters(
                    [
                        { type: "bytes32", name: "execMode" },
                        { type: "bytes", name: "executionCalldata" },
                    ],
                    `0x${callData.slice(10)}`, // Skip execute selector (0xe9ae5c53)
                )

                // 2. Decode the actual transaction parameters
                const to = executionCalldata.slice(0, 40) as `0x${string}`

                const {
                    success,
                    receipt: {
                        gasUsed,
                        blockHash,
                        blockNumber,
                        contractAddress,
                        cumulativeGasUsed,
                        effectiveGasPrice,
                        logs,
                        logsBloom,
                        transactionIndex,
                        type,
                    },
                } = userOpReceipt

                return {
                    // Standard transaction receipt fields
                    blockHash,
                    blockNumber,
                    contractAddress,
                    cumulativeGasUsed,
                    effectiveGasPrice,
                    from: sender,
                    gasUsed,
                    logs,
                    logsBloom,
                    status: success ? "success" : "reverted",
                    to,

                    // Not to be confused with `txReceipt.transactionHash`
                    // -`hash` is the hash of the userop
                    // - `txReceipt.transactionHash` is the hash of the bundler transaction that includes this userop
                    transactionHash: hash,
                    transactionIndex,
                    type,

                    // Original UserOp receipt for reference
                    originalUserOpReceipt: userOpReceipt,
                }
            } catch (_err) {
                console.warn("UserOperation lookup failed, falling back to regular transaction receipt lookup...")
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
