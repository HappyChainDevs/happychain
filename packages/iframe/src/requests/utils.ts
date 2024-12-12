import { type UUID, createUUID } from "@happychain/common"
import { abis } from "@happychain/contracts/account-abstraction/sepolia"
import { AuthState, EIP1193UnauthorizedError } from "@happychain/sdk-shared"
import { type Address, type Hex, type TransactionRequest, encodeFunctionData, hexToBigInt } from "viem"
import type { UserOperation } from "viem/account-abstraction"
import { getAuthState } from "../state/authState"
import { type AppURL, getAppURL, getIframeURL, isIframe } from "../utils/appURL.ts"

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
 * Extracts the sequence number of transaction from the nonce of a smart account.
 *
 * Smart accounts use a "2D nonce" system that allows multiple transaction sequences
 * to run in parallel :
 *
 * - Each sequence is like a numbered list of transactions starting from 0
 * - Different sequences can run at the same time using different "keys"
 * - When you get a nonce, it contains :
 *   - Which sequence it's from (the key, stored in upper 192 bits)
 *   - What position in that sequence (stored in lower 64 bits)
 *
 * For example :
 * The sequence of key 0 counts : 0, 1, 2, 3 ...
 * The sequence of key 1 counts : 0, 1, 2 ... but is stored as: 18446744073709551616, 18446744073709551617...
 * The sequence of key 2 counts : 0, 1, 2 ... but is stored as: 36893488147419103232, 36893488147419103233...
 *
 * @see {@link https://docs.stackup.sh/docs/useroperation-nonce} for detailed explanation
 * @see {@link https://github.com/pimlicolabs/entrypoint-estimations/blob/main/lib/account-abstraction/contracts/interfaces/INonceManager.sol}
 *
 * @param fullNonce - The full nonce from the smart account
 * @returns The position in the sequence (lower 64 bits)
 *
 * @example
 * const fullNonce = smartAccount.getNonce()
 * const position = extractSequenceFromNonce(fullNonce)
 */
export function extractSequenceFromNonce(fullNonce: Hex | bigint): bigint {
    const nonceBigInt = typeof fullNonce === "string" ? hexToBigInt(fullNonce) : fullNonce
    return nonceBigInt & ((1n << 64n) - 1n)
}
