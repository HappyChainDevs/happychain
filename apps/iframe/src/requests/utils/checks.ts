/**
 * Various validatation & assertion functions for use in request handlers.
 */

import { type Address, parseBigInt } from "@happy.tech/common"
import {
    AuthState,
    type EIP1193RequestParameters,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1474InvalidInput,
    permissionsLists,
} from "@happy.tech/wallet-common"
import { type RpcTransactionRequest, isAddress, isHex } from "viem"
import { getAuthState } from "#src/state/authState"
import type { AppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation"

/**
 * Check if the user is authenticated with the social login provider, otherwise throws an error.
 * @throws {EIP1193UnauthorizedError}
 */
export function checkAuthenticated() {
    if (getAuthState() !== AuthState.Connected) throw new EIP1193UnauthorizedError()
}

/**
 * Type of valid tx requests, use {@link checkedTx} to verify.
 */
export type ValidRpcTransactionRequest = RpcTransactionRequest & { from: Address; to: Address }

/**
 * Asserts that the transaction has its destination defined, throws a {@link EIP1474InvalidInput}.
 * @throws EIP1474InvalidInput if the transaction is malformatted
 */
export function checkedTx(tx: RpcTransactionRequest): ValidRpcTransactionRequest {
    if (!tx.to) /****/ throw new EIP1474InvalidInput("missing 'to' field in transaction parameters")
    if (!tx.from) /**/ throw new EIP1474InvalidInput("missing 'from' field in transaction parameters")

    if (!isAddress(tx.to)) /****/ throw new EIP1474InvalidInput(`not an address: ${tx.to}`)
    if (!isAddress(tx.from)) /**/ throw new EIP1474InvalidInput(`not an address: ${tx.from}`)

    if (tx.value && parseBigInt(tx.value) === undefined)
        throw new EIP1474InvalidInput(`value is not a number: ${tx.value}`)
    if (tx.nonce && parseBigInt(tx.nonce) === undefined)
        throw new EIP1474InvalidInput(`nonce is not a number: ${tx.nonce}`)

    if (tx.data && !isHex(tx.data)) return tx as ValidRpcTransactionRequest

    // TODO more

    return tx as ValidRpcTransactionRequest
}

/**
 * Checks that the address is valid, or throws.
 * @throws EIP1174InvalidInput if the address is invalid
 */
export function checkAddress(address: string): asserts address is Address {
    if (!isAddress(address)) throw new EIP1474InvalidInput(`invalid address: ${address}`)
}

/**
 * Returns the address if it is a valid Ethereum address.
 * @throws EIP1474InvalidInput if the input is not a valid address
 */
export function checkedAddress(address: string): Address {
    checkAddress(address)
    return address
}

/**
 * Ensures that the request can be performed without approval, otherwise throws.
 * @throws EIP1193UnauthorizedError if the request requires approval
 */
export function ensureRequestIsPermissionless(app: AppURL, requestParams: EIP1193RequestParameters) {
    if (checkIfRequestRequiresConfirmation(app, requestParams))
        throw new EIP1193UnauthorizedError(`request requires approval: ${requestParams.method} — IMPLEMENTATION BUG`)
}

const rpcMethods = Array<string>().concat(
    Array.from(permissionsLists.get("safe") ?? []),
    Array.from(permissionsLists.get("interactive") ?? []),
    Array.from(permissionsLists.get("unsafe") ?? []),
)

const happyMethods = new Set(rpcMethods.filter((a) => a.startsWith("happy_")))

/**
 * Ensures that the method is not a `happy_` method, otherwise throws.
 * @throws EIP1193UnsupportedMethodError
 */
export function ensureIsNotHappyMethod(
    requestParams: EIP1193RequestParameters,
): asserts requestParams is Exclude<typeof requestParams, { method: `happy_${string}` }> {
    if (happyMethods.has(requestParams.method))
        throw new EIP1193UnsupportedMethodError(
            `happy method unsupported by this handle: ${requestParams.method} — IMPLEMENTATION BUG`,
        )
}
