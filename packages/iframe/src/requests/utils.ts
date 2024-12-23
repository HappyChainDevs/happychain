import { type UUID, createUUID } from "@happychain/common"
import { abis } from "@happychain/contracts/account-abstraction/sepolia"
import { AuthState, EIP1193UnauthorizedError } from "@happychain/sdk-shared"
import { type Address, type TransactionRequest, encodeFunctionData } from "viem"
import type { EstimateUserOperationGasReturnType, UserOperation } from "viem/account-abstraction"
import { getAuthState } from "../state/authState"
import { type AppURL, getAppURL, getIframeURL, isIframe } from "../utils/appURL"

/** ID passed to the iframe by the parent window (app). */
const _parentID = new URLSearchParams(window.location.search).get("windowId")

if (!isIframe(getAppURL()) && !_parentID) {
    console.warn("Iframe initialized without windowId")
}

/** ID generated for this iframe (tied to a specific app). */
const _iframeID = createUUID()

/** ID generated for this iframe (tied to a specific app). */
// Expose as a function so that the function can be mocked.
export function iframeID(): UUID {
    return _iframeID
}

/**
 * Returns the app URL for the source ID, or undefined if the source ID is not allowed (i.e. neither
 * the iframe nor its parent).
 */
export function appForSourceID(sourceId: UUID): AppURL | undefined {
    if (sourceId === _parentID) return getAppURL()
    if (sourceId === _iframeID) return getIframeURL()
    return undefined
}

/**
 * Check if the user is authenticated with the social login provider, otherwise throws an error.
 * @throws {EIP1193UnauthorizedError}
 */
export function checkAuthenticated() {
    if (getAuthState() !== AuthState.Connected) {
        throw new EIP1193UnauthorizedError()
    }
}

const KERNEL_ABI = abis.Kernel

/**
 * Gas cost for deploying a smart account (Kernel).
 * Based on our observations: a single UserOperation in a bundle had a deployment overhead of 187K gas.
 * The value is adjusted to a safe upper limit to account for potential variations.
 */
export const ACCOUNT_DEPLOYMENT_COST = 190_000n

/**
 * Execution mode for standard transactions
 * @see https://github.com/zerodevapp/kernel/blob/737db3123165d6009c9261dc98e149a3fdd82f97/src/types/Constants.sol#L4-L23
 */
const CALL_MODE = "0x0000000000000000000000000000000000000000000000000000000000000000" as const

/**
 * Format a standard transaction into a UserOperation structure.
 * Gas-related fields and signature will need to be computed separately
 * with `prepareUserOperation()` to avoid expensive operations.
 *
 * @param tx - A standard transaction request from the app
 * @param sender - Address of the account sending the UserOperation
 * @returns Partially filled UserOperation, missing gas estimation, to, signature
 * @example
 * const tx = {
 *   to: aValidEthereumAddress,
 *   data: aValidHexValue,
 *   value: aValidBigInt,
 *   nonce: aValidNumber,
 * }
 * const sender = "0x123..."
 * const userOp = convertTxToUserOp(tx, sender)
 */
export function convertTxToUserOp(tx: TransactionRequest, sender: Address): Partial<UserOperation<"0.7">> {
    const callData = encodeFunctionData({
        abi: KERNEL_ABI,
        functionName: "execute",
        args: [CALL_MODE, tx?.data ?? "0x"],
    })

    return {
        sender,
        nonce: tx.nonce !== undefined ? BigInt(tx.nonce) : undefined,
        callData,
        callGasLimit: tx.gas !== undefined ? BigInt(tx.gas) : undefined,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        // The rest will be filled by `prepareUserOperation()`
    }
}

/**
 * Calculates the complete gas breakdown  for a userop.
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
 * @see {@link https://happychain.notion.site/4337-gas}
 * @see {@link https://docs.stackup.sh/docs/useroperation-gas-values}
 * @see {@link https://docs.stackup.sh/docs/erc-4337-bundler-rpc-methods#eth_estimateuseroperationgas}
 */
export async function calculateUserOpGasBreakdown(
    userOpGasEstimate: EstimateUserOperationGasReturnType,
    isAccountDeployed: boolean,
) {
    const additionalDeploymentCost = isAccountDeployed ? 0n : ACCOUNT_DEPLOYMENT_COST
    const totalGasLimit =
        userOpGasEstimate.callGasLimit + userOpGasEstimate.preVerificationGas + additionalDeploymentCost

    return {
        totalGasLimit,
        breakdown: {
            callGasLimit: userOpGasEstimate.callGasLimit,
            preVerificationGas: userOpGasEstimate.preVerificationGas,
            additionalDeploymentCost,
        },
    }
}
