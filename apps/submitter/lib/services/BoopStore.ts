import type { Address, Hash } from "@happy.tech/common"
import { computeHash } from "#lib/utils/boop/computeHash"
import type { Boop } from "../types"

/**
 * This stores the original version of all boops currently being processed by the submitter — from being received
 * on an endpoint to either (a) receiving the receipt (at which point the receipt, including the final version of
 * the boop, is stored into the database) or (b) answering all requests carrying the boop with an error status.
 *
 * Sponsored boops can have their gas limits and fees changed by the submitter and its
 * hash does not depend on these values, therefore there can be multiple "versions" of the boop with the same hash.
 *
 * Whenever these values are set as 0, the submitter fills them in. If they are not, the submitter
 * treats them as constraints to honor. We need to store the original version because we want to
 * keep honoring the original constraints in case the boop needs to be resubmitted onchain (e.g.
 * if the transaction gets stuck in the EVM mempool because of an insufficient EVM gas fee).
 */
export class BoopStore {
    readonly #byHash = new Map<Hash, Boop>()
    readonly #byNonce = new Map<string, Boop>()

    getByHash(boopHash: Hash): Boop | undefined {
        return this.#byHash.get(boopHash)
    }

    getByNonce(account: Address, nonceTrack: bigint, nonceValue: bigint): Boop | undefined {
        return this.#byNonce.get(`${account}/${nonceTrack}/${nonceValue}`)
    }

    set(boop: Boop) {
        // Enforce hash caching before copying and freezing.
        const hash = computeHash(boop)
        // Shallow clone and freeze the boop, preventing accidental mutation of the original boop.
        const ogBoop = Object.freeze({ ...boop })
        this.#byHash.set(hash, ogBoop)
        this.#byNonce.set(`${boop.account}/${boop.nonceTrack}/${boop.nonceValue}`, ogBoop)
        return this
    }

    hasHash(boopHash: Hash): boolean {
        return this.#byHash.has(boopHash)
    }

    hasNonce(account: Address, nonceTrack: bigint, nonceValue: bigint): boolean {
        return this.#byNonce.has(`${account}/${nonceTrack}/${nonceValue}`)
    }

    delete(boop: Boop) {
        this.#byNonce.delete(`${boop.account}/${boop.nonceTrack}/${boop.nonceValue}`)
        return this.#byHash.delete(computeHash(boop))
    }
}
