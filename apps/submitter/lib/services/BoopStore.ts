import { type Address, type Hash, Map2 } from "@happy.tech/common"
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
    readonly #byNonce = new Map2<Address, string, Boop>()
    readonly #entryPoints = new Map<Hash, Address>()

    getByHash(boopHash: Hash): Boop | undefined {
        return this.#byHash.get(boopHash)
    }

    getByNonce(account: Address, nonceTrack: bigint, nonceValue: bigint): Boop | undefined {
        return this.#byNonce.get(account, `${nonceTrack}/${nonceValue}`)
    }

    getByAccount(account: Address): Boop[] {
        return this.#byNonce.getAll(account)?.values()?.toArray() ?? []
    }

    set(boop: Boop, entryPoint: Address) {
        // Enforce hash caching before copying and freezing.
        const boopHash = computeHash(boop)
        // Shallow clone and freeze the boop, preventing accidental mutation of the original boop.
        const ogBoop = Object.freeze({ ...boop })
        this.#byHash.set(boopHash, ogBoop)
        this.#byNonce.set(boop.account, `${boop.nonceTrack}/${boop.nonceValue}`, ogBoop)
        this.#entryPoints.set(boopHash, entryPoint)
        return this
    }

    getEntryPoint(boopHash: Hash): Address | undefined {
        return this.#entryPoints.get(boopHash)
    }

    hasHash(boopHash: Hash): boolean {
        return this.#byHash.has(boopHash)
    }

    hasNonce(account: Address, nonceTrack: bigint, nonceValue: bigint): boolean {
        return this.#byNonce.has(account, `${nonceTrack}/${nonceValue}`)
    }

    delete(boop: Boop) {
        const boopHash = computeHash(boop)
        this.#byNonce.delete(boop.account, `${boop.nonceTrack}/${boop.nonceValue}`)
        this.#entryPoints.delete(boopHash)
        return this.#byHash.delete(boopHash)
    }
}
