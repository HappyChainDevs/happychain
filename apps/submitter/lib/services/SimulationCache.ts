import type { Address } from "@happy.tech/common"
import type { Hex } from "viem"
import { env } from "#lib/env"
import type { SimulateInput, SimulateOutput } from "#lib/handlers/simulate"
import { computeHash } from "../utils/boop/computeHash"

/**
 * A LRU cache to store simulation outputs.
 */
export class SimulationCache {
    private readonly maxSize: number
    private readonly ttl: number
    private readonly expiryMap: Map<string, NodeJS.Timeout>
    private readonly outputMap: Map<Hex, SimulateOutput>

    constructor(size = env.SIMULATION_CACHE_SIZE, ttl = env.SIMULATION_CACHE_TTL) {
        this.maxSize = size
        this.ttl = ttl
        this.expiryMap = new Map()
        this.outputMap = new Map()
    }

    async findSimulation(entryPoint: Address, boopHash: Hex): Promise<SimulateOutput | undefined> {
        const key = (entryPoint + boopHash) as Hex
        const value = this.outputMap.get(key)
        if (value === undefined) return undefined

        // LRU logic: Move to end by re-inserting
        this.outputMap.delete(key)
        this.outputMap.set(key, value)
        this.#resetExpiry(key)

        return value
    }

    async insertSimulation(input: Required<SimulateInput>, output: SimulateOutput) {
        const key = (input.entryPoint + computeHash(input.boop)) as Hex

        if (this.expiryMap.has(key)) this.#clearExpiry(key)
        this.outputMap.set(key, output)
        this.expiryMap.set(
            key,
            setTimeout(() => this.#delete(key), this.ttl),
        )

        // Enforce maxSize by evicting the oldest entry if needed
        if (this.maxSize > 0 && this.outputMap.size > this.maxSize) {
            const firstKey = this.outputMap.keys().next().value
            if (firstKey) this.#delete(firstKey)
        }
    }

    #delete(key: Hex): boolean {
        this.#clearExpiry(key)
        return this.outputMap.delete(key)
    }

    #resetExpiry(key: Hex): void {
        const expiry = this.expiryMap.get(key)
        if (!expiry) return
        clearTimeout(expiry)
        const newTimeoutId = setTimeout(() => this.#delete(key), this.ttl)
        this.expiryMap.set(key, newTimeoutId)
    }

    #clearExpiry(key: Hex): void {
        const expiry = this.expiryMap.get(key)
        if (!expiry) return
        clearTimeout(expiry)
        this.expiryMap.delete(key)
    }
}
