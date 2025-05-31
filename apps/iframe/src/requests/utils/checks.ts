/**
 * Various validation & assertion functions for use in request handlers.
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
import { checksum } from "ox/Address"
import { type RpcTransactionRequest, type WatchAssetParameters, isAddress, isHex } from "viem"
import { getAuthState } from "#src/state/authState"
import { getUser } from "#src/state/user.ts"
import type { AppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/utils/checkIfRequestRequiresConfirmation"

/**
 * Check if the user is authenticated with the social login provider, otherwise throws an error.
 * @throws EIP1193UnauthorizedError
 */
export function checkAuthenticated() {
    if (getAuthState() !== AuthState.Connected) throw new EIP1193UnauthorizedError()
}

/**
 * Type of valid tx requests, use {@link checkedTx} to verify.
 */
export type ValidRpcTransactionRequest = RpcTransactionRequest & { to: Address }

/**
 * Asserts that the transaction has its destination defined, throws a {@link EIP1474InvalidInput}.
 * @throws EIP1474InvalidInput if the transaction is malformatted
 */
export function checkedTx(tx: RpcTransactionRequest): ValidRpcTransactionRequest {
    // Check required fields
    if (!tx.to) /****/ throw new EIP1474InvalidInput("missing 'to' field in transaction parameters")

    // Validate addresses
    if (!isAddress(tx.to)) /****/ throw new EIP1474InvalidInput(`not an address: ${tx.to}`)
    if (tx.from && !isAddress(tx.from)) /**/ throw new EIP1474InvalidInput(`not an address: ${tx.from}`)

    // Validate that the from address is the current connected users account
    if (tx.from && checksum(tx.from) !== getUser()?.address)
        /**/ throw new EIP1474InvalidInput(`invalid 'from' address: ${tx.from}`)

    // Check if the value and nonce exist, and can be parsed as BigInt (allows zero values)
    if (tx.value !== undefined && parseBigInt(tx.value) === undefined)
        throw new EIP1474InvalidInput(`value is not a number: ${tx.value}`)
    if (tx.nonce !== undefined && parseBigInt(tx.nonce) === undefined)
        throw new EIP1474InvalidInput(`nonce is not a number: ${tx.nonce}`)

    // Validate gas price parameters based on transaction type
    // Legacy transactions use gasPrice
    if (tx.gasPrice !== undefined && parseBigInt(tx.gasPrice) === undefined)
        throw new EIP1474InvalidInput(`gasPrice is not a number: ${tx.gasPrice}`)

    // EIP-1559 transactions use maxFeePerGas and maxPriorityFeePerGas
    if (tx.maxFeePerGas !== undefined && parseBigInt(tx.maxFeePerGas) === undefined)
        throw new EIP1474InvalidInput(`maxFeePerGas is not a number: ${tx.maxFeePerGas}`)
    if (tx.maxPriorityFeePerGas !== undefined && parseBigInt(tx.maxPriorityFeePerGas) === undefined)
        throw new EIP1474InvalidInput(`maxPriorityFeePerGas is not a number: ${tx.maxPriorityFeePerGas}`)

    if (tx.data && !isHex(tx.data)) return tx as ValidRpcTransactionRequest

    // TODO more

    return tx as ValidRpcTransactionRequest
}

/**
 * Checks the validity of the asset address and checksums it.
 * @throws EIP1474InvalidInput if the asset address is invalid
 */
export function checkedWatchedAsset(params: WatchAssetParameters) {
    return {
        type: params.type,
        options: {
            ...params.options,
            address: checkAndChecksumAddress(params.options.address),
        },
    }
}

/**
 * Checks that the address is valid, or throws.
 * @throws EIP1474InvalidInput if the address is invalid
 */
export function checkAddress(address?: string): asserts address is Address {
    if (!address || !isAddress(address)) throw new EIP1474InvalidInput(`invalid address: ${address}`)
}

/**
 * Returns the checksumed address if it is a valid Ethereum address.
 * @throws EIP1474InvalidInput if the input is not a valid address
 */
export function checkAndChecksumAddress(address: string): Address {
    checkAddress(address)
    return checksum(address)
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
