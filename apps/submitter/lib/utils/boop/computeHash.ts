import { type Hash, getProp } from "@happy.tech/common"
import { env } from "#lib/env"
import type { Boop } from "#lib/types"
import { computeBoopHash } from "./computeBoopHash"

export type ComputeHashOptions = {
    /** Cache the hash onto the object itself. */
    cache?: boolean
}

/**
 * Internal version of {@link computeBoopHash}, which inlines the chain ID & performs caching.
 *
 * IMPORTANT: Tests must use {@link computeBoopHash} has they edit boops in place!
 */
export function computeHash_assign(boop: Boop): Hash {
    // We sneakily piggyback the boopHash on the boop as a form of caching.
    // We must never edit boop object in place!
    const cached = getProp(boop, "boopHash", "string")
    if (cached) return cached as Hash
    const boopHash = computeBoopHash(env.CHAIN_ID, boop)
    Object.assign(boop, { boopHash })
    return boopHash
}

const hashMap = new WeakMap<Boop, Hash>()
export function computeHash_weakmap(boop: Boop): Hash {
    const cached = hashMap.get(boop)
    if (cached) return cached
    const boopHash = computeBoopHash(env.CHAIN_ID, boop)
    hashMap.set(boop, boopHash)
    return boopHash
}

export const computeHash = computeHash_weakmap
