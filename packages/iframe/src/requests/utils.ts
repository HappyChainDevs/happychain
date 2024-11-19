import { type UUID, createUUID } from "@happychain/common"
import { AuthState, EIP1193UnauthorizedError } from "@happychain/sdk-shared"
import type { SmartAccountClient } from "permissionless"
import type { Address, Hex } from "viem"
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

/**
 * @todo - determine if this should be declared here (probably not ?)
 * Translate a standard transaction to UserOperation format.
 *
 * @param tx - Standard Ethereum transaction request from a dapp
 * @param client - Smart account client instance that handles the actual translation
 * @returns Prepared UserOperation
 */
export async function convertTxToUserOp(
    tx: {
        to: Address
        data?: Hex
        value?: bigint
        nonce?: bigint
    },
    client: SmartAccountClient,
): Promise<UserOperation> {
    if (!tx.to) throw new Error("To address is required")

    const op = await client.prepareUserOperation({
        account: client.account!,
        calls: [
            {
                to: tx.to,
                value: tx.value ?? 0n,
                // presumably for `data`, you'd get this value from using something like either :
                // - `encodeFunctionData()` ;
                // - `prepareEncodeFunctionData()` ;
                data: tx.data,
            },
        ],
        ...(tx.nonce !== undefined && { nonce: tx.nonce }),
    })

    return {
        sender: op.sender,
        nonce: op.nonce,
        callData: op.callData,
        callGasLimit: op.callGasLimit,
        verificationGasLimit: op.verificationGasLimit,
        preVerificationGas: op.preVerificationGas,
        maxFeePerGas: op.maxFeePerGas,
        maxPriorityFeePerGas: op.maxPriorityFeePerGas,
        paymasterAndData: op.paymasterAndData,
        signature: op.signature,
    }
}
