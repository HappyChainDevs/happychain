import type { Hex } from "@happy.tech/common"
import { computeHash } from "#lib/utils/boop/computeHash"
import type { Boop } from "../types"

export class OgBoopCache {
    readonly #map: Map<Hex, Boop>

    constructor() {
        this.#map = new Map()
    }

    #getKey(boop: Boop) {
        return computeHash(boop)
        // TODO: this should protect against multiple different boops, with different hashes, but same nonceValues
        // would this be more correctly aligned behavior?
        // return `${boop.account}-${boop.nonceValue}-${boop.nonceTrack}`
    }

    get(boop: Boop) {
        return this.#map.get(this.#getKey(boop))
    }

    set(boop: Boop) {
        // shallow clone boop, and freeze. This prevents mutations on the Stored Boop,
        // however has no impact on the active boop, which is now a separate object.
        const ogBoop = Object.freeze({ ...boop })
        this.#map.set(this.#getKey(ogBoop), ogBoop)
        return this
    }

    has(boop: Boop) {
        return this.#map.has(this.#getKey(boop))
    }
    delete(boop: Boop) {
        return this.#map.delete(this.#getKey(boop))
    }
}
