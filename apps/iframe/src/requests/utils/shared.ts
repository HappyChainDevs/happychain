/**
 * Core request handler logic shared between two or more handlers.
 */

import { type EVMReceipt, GetState, Onchain } from "@happy.tech/boop-sdk"
import type { Hash, Hex } from "@happy.tech/common"
import { EIP1474InternalError, type HappyUser } from "@happy.tech/wallet-common"
import { type Address, type Transaction, toHex } from "viem"
import { entryPoint } from "#src/constants/contracts"
import {
    boopFromTransaction,
    formatTransaction,
    formatTransactionReceipt,
    getCurrentNonce,
    getOnchainNonce,
} from "#src/requests/utils/boop"
import { boopCache } from "#src/requests/utils/boopCache"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import type { BlockParam } from "#src/requests/utils/eip1474"
import { getBoopClient } from "#src/state/boopClient"
import { reqLogger } from "#src/utils/logger"

export const FORWARD = Symbol("FORWARD")
export type Forward = typeof FORWARD

/**
 * Returns an Ethereum RPC-style transaction object for the given hash. This first assumes the hash is a boop hash and
 * tries to fetch it. If the hash is not found, the function returns {@link FORWARD} to signal that the request should
 * be passed to the public client to find an actual Ethereum transaction.
 */
export async function getTransactionByHash(hash: Hash): Promise<Transaction | Forward | null> {
    const cached = boopCache.get(hash)

    // TODO we must NOT store receipts where the nonce was not incremented
    // If the receipt is present, the entry is final. If not, try to fetch a more up-to-date state.
    if (cached?.receipt) return formatTransaction(hash, cached)

    try {
        const boopClient = getBoopClient()
        if (!boopClient) throw new Error("Boop client not initialized")
        const output = await boopClient.getState({ hash })
        if (output.status === GetState.Receipt) {
            const receipt = output.receipt
            const cached = boopCache.putReceipt(hash, receipt)
            return formatTransaction(hash, cached)
        } else if (output.status === GetState.Simulated) {
            if (!cached?.boop) {
                reqLogger.warn("boop was simulated, but its data is missing", hash)
                return null
            } else if (output.simulation.status === Onchain.Success) {
                return formatTransaction(hash, cached, output.simulation)
            } else {
                return null
            }
        } else {
            // Not sure this hash is a boop, try getting an EVM tx by this hash.
            return FORWARD
        }
    } catch (err) {
        // We had a cache hit without receipt, so this is a boop, just use that.
        if (cached) return formatTransaction(hash, cached)

        // This *could* be an EVM tx hash, but we only land here if there is a submitter failure,
        // in which case things are pretty fucked anyway, so might as well bail out.
        throw new EIP1474InternalError("failed to fetch boop state", err)
    }
}

/**
 * Returns an Ethereum-style transaction receipt for the given hash. This first assumes the hash is a boop hash and
 * tries to fetch it. If the hash is not found, the function returns {@link FORWARD} to signal that the request should
 * be passed to the public client to find an actual Ethereum transaction receipt.
 */
export async function getTransactionReceipt(hash: Hash): Promise<EVMReceipt | Forward | null> {
    // TODO fill cache from sending side
    const cached = boopCache.get(hash)
    if (cached?.receipt) return formatTransactionReceipt(hash, cached.receipt)

    try {
        const boopClient = getBoopClient()
        if (!boopClient) throw new Error("Boop client not initialized")
        const state = await boopClient.getState({ hash })
        if (state.status !== GetState.Receipt) {
            // If the boop is unknown: this might be a tx hash instead, signal caller to forward to the public client.
            return cached || state.status === GetState.Simulated ? null : FORWARD
        }

        boopCache.put(hash, { boop: cached?.boop, receipt: state.receipt })
        return formatTransactionReceipt(hash, state.receipt)
    } catch (err) {
        // This *could* be an EVM tx hash, but we only land here if there is a submitter failure,
        // in which case things are pretty fucked anyway, so might as well bail out.
        throw new EIP1474InternalError("failed to fetch boop state", err)
    }
}

/**
 * If the address is the local account's address, return its boop nonce. If the block tag is
 * "pending", use the local nonce view for this. We *do not* do this for other boop accounts, at
 * least at the moment. This returns {@link FORWARD} to signify that the transaction count query
 * should be made with a public client (because the queries address is not the local address).
 */
export async function getTransactionCount(
    user: HappyUser | undefined,
    [address, block]: [Address, BlockParam],
): Promise<Hex | Forward> {
    return user && address.toLowerCase() === user.address.toLowerCase()
        ? block === "pending"
            ? toHex(await getCurrentNonce(address as Address))
            : toHex(await getOnchainNonce(address as Address, 0n, block))
        : FORWARD
    // NOTE: We could lookup to see if the address is that of another boop account. Not worth the hassle for now.
}

/**
 * Attempts to estimate the gas by interpreting the tx as a boop from the local account. If the tx is not originating
 * from the local account, returns {@link FORWARD} to indicate the request should be directed at a public client instead.
 * We currently can't simulate gas for other boop accounts.
 *
 * This handles both EIP-1559 and legacy transactions, preserving their gas parameters.
 */
export async function eth_estimateGas(
    user: HappyUser | undefined,
    tx: ValidRpcTransactionRequest,
): Promise<Hex | Forward> {
    if (user?.address !== tx.from) return FORWARD

    try {
        const boopClient = getBoopClient()
        if (!boopClient) throw new Error("Boop client not initialized")

        // boopFromTransaction already handles both legacy and EIP-1559 transactions
        // by converting gasPrice to maxFeePerGas when needed
        const boop = await boopFromTransaction(user?.address, tx)
        const output = await boopClient.simulate({ entryPoint, boop })

        if (output.status !== Onchain.Success) {
            // Provide more detailed error information based on simulation output
            const errorMsg =
                "description" in output && output.description
                    ? output.description
                    : "Simulation failed with unknown reason"
            reqLogger.warn("Gas estimation simulation failed", { tx, error: errorMsg, status: output.status })
            throw new EIP1474InternalError(`Gas estimation failed: ${errorMsg}`)
        }

        // Return the gas estimate, which already accounts for the appropriate transaction type
        return toHex(output.executeGas)
    } catch (error) {
        // Catch and log any errors during the estimation process
        reqLogger.error("Gas estimation error", error)

        if (error instanceof Error) {
            // If it's a Viem error with a code property, rethrow it
            if ("code" in error && typeof error.code !== "undefined") {
                throw error
            }

            // Otherwise, wrap in EIP1474InternalError with the original error message
            throw new EIP1474InternalError(
                `Failed to estimate gas: ${error.message}`,
                { cause: error }, // Unimplemented
            )
        }

        // For non-Error objects, create a new error
        throw new EIP1474InternalError(
            "Failed to estimate gas: unknown error",
            { cause: error }, // Unimplemented
        )
    }
}
