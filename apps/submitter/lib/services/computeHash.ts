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
 */
export function computeHash(boop: Boop, options: ComputeHashOptions = { cache: false }): Hash {
    // We sneakily piggyback the boopHash on the boop as a form of caching.
    // We must never edit boop object in place!
    //
    const cached = getProp(boop, "boopHash", "string")
    if (cached) return cached as Hash
    const boopHash = computeBoopHash(env.CHAIN_ID, boop)
    if (options.cache) Object.assign(boop, { boopHash })
    return boopHash
}
