import type { Hash } from "@happy.tech/common"
import { env } from "#lib/env"
import { traceFunction } from "#lib/telemetry/traces"
import type { Boop } from "#lib/types"
import { computeBoopHash } from "./computeBoopHash"

/**
 * Internal version of {@link computeBoopHash}, which inlines the chain ID & performs caching.
 *
 * IMPORTANT: Editing fields of the boop will break the caching, unless they are gas limits and fees for sponsored
 * boop. If you need to edit these other fields (e.g. in tests), then use {@link computeBoopHash} instead!
 */
const hashMap = new WeakMap<Boop, Hash>()
function computeHash(boop: Boop): Hash {
    const cached = hashMap.get(boop)
    if (cached) return cached
    const boopHash = computeBoopHash(env.CHAIN_ID, boop)
    hashMap.set(boop, boopHash)
    return boopHash
}

const tracedComputeHash = traceFunction(computeHash, "computeHash")

export { tracedComputeHash as computeHash }
