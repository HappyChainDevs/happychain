import { HappyMethodNames } from "@happychain/common"
import {
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    type Msgs,
    type ProviderMsgsFromApp,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import { decodeNonce } from "permissionless"
import { type Client, InvalidAddressError, decodeAbiParameters, isAddress, parseAbiParameters } from "viem"
import { getCurrentChain } from "#src/state/chains"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
import { getUser } from "#src/state/user"
import type { AppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkPermissions"
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
    const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient

    switch (request.payload.method) {
        case "eth_chainId": {
            const currChain = getCurrentChain().chainId
            return currChain ?? (await sendToPublicClient(app, request))
        }

        case "eth_accounts": {
            const user = getUser()
            return user && hasPermissions(app, "eth_accounts") ? [user.address] : []
        }

        case HappyMethodNames.HAPPY_USER_RPC_METHOD: {
            const user = getUser()
            return user && hasPermissions(app, "eth_accounts") ? getUser() : undefined
        }

        case "eth_requestAccounts":
            checkAuthenticated()
            if (!hasPermissions(app, "eth_accounts")) {
                throw new EIP1193UserRejectedRequestError()
            }
            return isAddress(`${getUser()?.address}`) ? [getUser()?.address] : []

        case "eth_getTransactionReceipt": {
            const [hash] = request.payload.params

            // Attempt to retrieve UserOperation details first.
            // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
            try {
                const promiseUserOpInfo = smartAccountClient.getUserOperation({ hash })
                const promiseUserOpReceipt = smartAccountClient.getUserOperationReceipt({ hash })

                const [userOpInfo, userOpReceipt] = await Promise.all([promiseUserOpInfo, promiseUserOpReceipt])

                const { callData, sender } = userOpInfo.userOperation

                /**
                 * Smart account transactions have 2 nested layers of data that we need to decode :
                 *
                 * 1. First layer (execute function) :
                 *    The outer wrapper is a call to the `execute()` function (selector: `0xe9ae5c53`)
                 *    We decode this to get :
                 *    - `mode`: how to execute the transaction
                 *    - `data`: the actual transaction details (wrapped)
                 *
                 * 2. Second layer (transaction details) :
                 *    Inside `data`, we find the real transaction information (to, value, data).
                 *
                 * @see {@link https://docs.stackup.sh/docs/useroperation-calldata} for additional explanation
                 * @see {@link https://eips.ethereum.org/EIPS/eip-4337#definitions} for the EIP-4337 specification
                 */

                // 1. Decode the `execute()` function parameters
                const [, executeParamsData] = decodeAbiParameters(
                    parseAbiParameters("bytes32 mode, bytes data"),
                    callData.slice(10) as `0x${string}`, // Skip execute selector (0xe9ae5c53 = 10 characters including 0x prefix)
                )

                // 2. Decode the actual transaction parameters
                const [to] = decodeAbiParameters(parseAbiParameters("address to"), executeParamsData)

                const { receipt: txReceipt } = userOpReceipt
                const {
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
                } = txReceipt

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

                    // Not to be confused with `txReceipt.status`
                    // `userOpReceipt.success` indicates if this this specific operation succeeded
                    //  `txReceipt.status` is the bundle transaction status
                    status: userOpReceipt.success ? "success" : "reverted",
                    to,

                    // Not to be confused with `txReceipt.transactionHash`
                    // `hash` is the hash of the userop transaction
                    //  `txReceipt.transactionHash` is the hash of the bundled transaction that includes this userop
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

        default:
            return sendToPublicClient(app, request)
    }
}

async function sendToPublicClient(app: AppURL, request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    if (checkIfRequestRequiresConfirmation(app, request.payload)) {
        throw new EIP1193UnauthorizedError()
    }
    const client: Client = getPublicClient()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
