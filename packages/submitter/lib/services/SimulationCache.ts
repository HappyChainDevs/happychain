import type { Hex } from "viem"
import { env } from "#lib/env"
import type { SimulateInput, SimulateOutput } from "#lib/interfaces/boop_simulate"

import { computeBoopHash } from "#lib/utils/computeBoopHash"

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

    async findSimulation(hash: Hex): Promise<SimulateOutput | undefined> {
        const value = this.outputMap.get(hash)
        if (value === undefined) return undefined

        // LRU logic: Move to end by re-inserting
        this.outputMap.delete(hash)
        this.outputMap.set(hash, value)
        this.resetExpiry(hash)

        return value
    }

    async insertSimulation(input: SimulateInput, output: SimulateOutput) {
        const hash = computeBoopHash(BigInt(env.CHAIN_ID), input.boop)
        // TODO needs to key on the entrypoint too

        if (this.expiryMap.has(hash)) this.clearExpiry(hash)
        this.outputMap.set(hash, output)
        this.expiryMap.set(
            hash,
            setTimeout(() => this.delete(hash), this.ttl),
        )

        // Enforce maxSize by evicting the oldest entry if needed
        if (this.maxSize > 0 && this.outputMap.size > this.maxSize) {
            const firstKey = this.outputMap.keys().next().value
            if (firstKey) this.delete(firstKey)
        }
    }

    private delete(hash: Hex): boolean {
        this.clearExpiry(hash)
        return this.outputMap.delete(hash)
    }

    private resetExpiry(hash: Hex): void {
        const expiry = this.expiryMap.get(hash)
        if (!expiry) return
        clearTimeout(expiry)
        const newTimeoutId = setTimeout(() => this.delete(hash), this.ttl)
        this.expiryMap.set(hash, newTimeoutId)
    }

    private clearExpiry(hash: Hex): void {
        const expiry = this.expiryMap.get(hash)
        if (!expiry) return
        clearTimeout(expiry)
        this.expiryMap.delete(hash)
    }
}
