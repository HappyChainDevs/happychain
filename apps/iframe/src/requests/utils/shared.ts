/**
 * Core request handler logic shared between two or more handlers.
 */

import { GetState, Onchain, type Receipt } from "@happy.tech/boop-sdk"
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
import { boopClient } from "#src/state/boopClient"

export const FORWARD = Symbol("FORWARD")
export type Forward = typeof FORWARD

/**
 * Returns an Ethereum RPC-style transaction object for the given hash. This first assumes the hash is a boop hash and
 * tries to fetch it. If the hash is not found, the function returns {@link FORWARD} to signal that the request should
 * be passed to the public client to find an actual Ethereum transaction.
 */
export async function getTransactionByHash(hash: Hash): Promise<Transaction | Forward | null> {
    const cached = boopCache.get(hash)

    // If the receipt is present, the entry is final. If not, try to fetch a more up-to-date state.
    if (cached?.receipt) return formatTransaction(hash, cached.boop, cached.receipt)

    try {
        const output = (await boopClient.state({ hash })).unwrap()
        if (output.status === GetState.Receipt) {
            const receipt = output.receipt
            const boop = undefined
            // const { receipt, boop } = output.state // TODO

            boopCache.put(hash, { boop, receipt })
            return formatTransaction(hash, boop, receipt)
        } else {
            // TODO can we get something useful out of the simulation result — yes, most likely
            return output.status === GetState.Simulated ? null : FORWARD
        }
    } catch (_err) {
        // We had a cache hit without receipt, so this is a boop, just use that.
        if (cached) return formatTransaction(hash, cached.boop, cached.receipt)

        // This *could* be an EVM tx hash, but we only land here if there is a submitter failure,
        // in which case things are pretty fucked anyway, so might as well bail out.
        throw new EIP1474InternalError("failed to fetch boop state") // TODO pass cause once output format cleaned up
    }
}

/**
 * Returns an Ethereum-style transaction receipt for the given hash. This first assumes the hash is a boop hash and
 * tries to fetch it. If the hash is not found, the function returns {@link FORWARD} to signal that the request should
 * be passed to the public client to find an actual Ethereum transaction receipt.
 */
export async function getTransactionReceipt(hash: Hash): Promise<Receipt | Forward | null> {
    // TODO fill cache from sending side
    const cached = boopCache.get(hash)
    if (cached?.receipt) return formatTransactionReceipt(hash, cached.receipt)

    try {
        const state = (await boopClient.state({ hash })).unwrap()
        if (state.status === GetState.Receipt) {
            boopCache.put(hash, { boop: cached?.boop, receipt: state.receipt })
            return formatTransactionReceipt(hash, state.receipt)
        } else {
            // If the boop is unknown: this might be a tx hash instead, signal caller to forward to the public client.
            return cached || state.status === GetState.Simulated ? null : FORWARD
        }
    } catch (_err) {
        // This *could* be an EVM tx hash, but we only land here if there is a submitter failure,
        // in which case things are pretty fucked anyway, so might as well bail out.
        throw new EIP1474InternalError("failed to fetch boop state") // TODO pass cause once output format cleaned up
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
 * Attempts to estimate the gas by interpreting the tx as a book from the local account. If the tx is not originating
 * from the local account, returns {@link FORWARD} to indicate the request should be directed at a public client instead.
 * We currently can't simulate gas for other boop accounts.
 */
export async function eth_estimateGas(
    user: HappyUser | undefined,
    tx: ValidRpcTransactionRequest,
): Promise<Hex | Forward> {
    if (user?.address !== tx.from) return FORWARD

    const boop = await boopFromTransaction(user?.address, tx)
    const output = (await boopClient.simulate({ entryPoint, boop })).unwrap()

    // TODO need robust error handling
    if (output.status !== Onchain.Success) throw new Error("can't simulate lol")

    return toHex(output.executeGas)
}
