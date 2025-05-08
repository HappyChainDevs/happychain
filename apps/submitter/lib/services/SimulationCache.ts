import type { Hex } from "viem"
import { env } from "#lib/env"
import type { SimulateInput, SimulateOutput } from "#lib/handlers/simulate"
import { computeBoopHash } from "./computeBoopHash"

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

    async findSimulation(boopHash: Hex): Promise<SimulateOutput | undefined> {
        const value = this.outputMap.get(boopHash)
        if (value === undefined) return undefined

        // LRU logic: Move to end by re-inserting
        this.outputMap.delete(boopHash)
        this.outputMap.set(boopHash, value)
        this.resetExpiry(boopHash)

        return value
    }

    async insertSimulation(input: SimulateInput, output: SimulateOutput) {
        const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), input.boop)
        // TODO needs to key on the entrypoint too

        if (this.expiryMap.has(boopHash)) this.clearExpiry(boopHash)
        this.outputMap.set(boopHash, output)
        this.expiryMap.set(
            boopHash,
            setTimeout(() => this.delete(boopHash), this.ttl),
        )

        // Enforce maxSize by evicting the oldest entry if needed
        if (this.maxSize > 0 && this.outputMap.size > this.maxSize) {
            const firstKey = this.outputMap.keys().next().value
            if (firstKey) this.delete(firstKey)
        }
    }

    private delete(boopHash: Hex): boolean {
        this.clearExpiry(boopHash)
        return this.outputMap.delete(boopHash)
    }

    private resetExpiry(boopHash: Hex): void {
        const expiry = this.expiryMap.get(boopHash)
        if (!expiry) return
        clearTimeout(expiry)
        const newTimeoutId = setTimeout(() => this.delete(boopHash), this.ttl)
        this.expiryMap.set(boopHash, newTimeoutId)
    }

    private clearExpiry(boopHash: Hex): void {
        const expiry = this.expiryMap.get(boopHash)
        if (!expiry) return
        clearTimeout(expiry)
        this.expiryMap.delete(boopHash)
    }
}
