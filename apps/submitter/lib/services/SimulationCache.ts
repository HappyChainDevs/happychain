import type { Address, Hex } from "@happy.tech/common"
import { env } from "#lib/env"
import type { SimulateInput, SimulateOutput } from "#lib/handlers/simulate"
import { LruCache } from "#lib/utils/LruCache"
import { computeHash } from "../utils/boop/computeHash"

/**
 * A LRU cache to store simulation outputs.
 */
export class SimulationCache {
    readonly #lru: LruCache<Hex, SimulateOutput>

    constructor(size = env.SIMULATION_CACHE_SIZE, ttl = env.SIMULATION_CACHE_TTL) {
        this.#lru = new LruCache({
            max: size,
            maxAge: ttl,
        })
    }

    async findSimulation(entryPoint: Address, boopHash: Hex): Promise<SimulateOutput | undefined> {
        const key = (entryPoint + boopHash) as Hex
        return this.#lru.get(key)
    }

    async insertSimulation(input: Required<SimulateInput>, output: SimulateOutput) {
        const key = (input.entryPoint + computeHash(input.boop)) as Hex
        this.#lru.set(key, output)
    }
}
