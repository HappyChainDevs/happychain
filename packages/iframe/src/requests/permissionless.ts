import { HappyMethodNames } from "@happychain/common"
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
import { type Client, InvalidAddressError, decodeAbiParameters, hexToBigInt, isAddress, parseAbiParameters } from "viem"
import { getCurrentChain } from "#src/state/chains"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
import { getUser } from "#src/state/user"
import type { AppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkPermissions"
import { sendResponse } from "./sendResponse"
import { ACCOUNT_DEPLOYMENT_COST, appForSourceID, checkAuthenticated } from "./utils"

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
    const isAccountDeployed = await smartAccountClient.account.isDeployed()

    switch (request.payload.method) {
        case "eth_chainId": {
            const currChain = getCurrentChain().chainId
            return currChain ?? (await sendToPublicClient(app, { ...request, payload: request.payload }))
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
                const [, executeParamsData] = decodeAbiParameters(
                    parseAbiParameters("bytes32 execMode, bytes executeParamsData"),
                    callData.slice(10) as `0x${string}`, // Skip execute selector (0xe9ae5c53 = 10 characters including 0x prefix)
                )

                // 2. Decode the actual transaction parameters
                const [to] = decodeAbiParameters(parseAbiParameters("address to"), executeParamsData)

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
            const gasEstimation = await smartAccountClient.estimateUserOperationGas({
                calls: [
                    {
                        to: tx.to as `0x${string}`,
                        data: tx.data || "0x",
                        value: tx.value ? hexToBigInt(tx.value) : 0n,
                    },
                ],
            })
            const additionalDeploymentCost = isAccountDeployed ? 0n : ACCOUNT_DEPLOYMENT_COST

            /**
             * Gas estimation that will be used in `eth_sendTransaction`.
             *
             * In account abstraction, gas estimation includes multiple components :
             *
             * 1. `preVerificationGas` (PVG): Static overhead for the bundler to process the operation
             *    - Always charged, not a limit
             *    - Covers the cost of the bundler to submit the UserOp to `EntryPoint`
             *
             * 2. `verificationGasLimit` (VGL): The maximum gas for validation phase
             *    - Account and signature validation
             *    - Smart account deployment (first transaction)
             *    - Paymaster validation (if used)
             *
             * 3. `callGasLimit` (CGL): The maximum gas for the actual transaction execution
             *    - Like regular EOA transaction gas
             *    - Used for the main operation (transfer, contract call, etc.)
             *
             * 4. `additionalDeploymentCost`: For first-time smart account deployment
             *    - Only added if account is not yet deployed
             *
             * Sidenote about total gas calculation :
             * - Without paymaster: PVG + VGL + CGL
             * - With paymaster: PVG + (3 * VGL) + CGL
             *   (`verificationGasLimit` is multiplied by 3 for initial validation, postOp, and potential postOp revert)
             *
             * The guaranteed gas consumption includes :
             * - `callGasLimit`: Gas for the main operation
             * - `preVerificationGas`: Bundler overhead
             * - `additionalDeploymentCost`: Gas for smart account deployment (if not deployed yet)
             *
             * @see {@link https://docs.stackup.sh/docs/useroperation-gas-values}
             * @see {@link https://docs.stackup.sh/docs/erc-4337-bundler-rpc-methods#eth_estimateuseroperationgas}
             */
            const guaranteedGasConsumption =
                gasEstimation.callGasLimit + gasEstimation.preVerificationGas + additionalDeploymentCost
            return guaranteedGasConsumption
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
