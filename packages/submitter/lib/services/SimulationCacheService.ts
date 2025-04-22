import { env } from "#lib/env"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"

/**
 * An Auto Expiring LRU cache to store SimulationResults.
 */
export class SimulationCacheService extends Map<string, SimulationResult> {
    private maxSize: number
    private ttl: number
    private expiryMap: Map<string, NodeJS.Timeout>

    constructor(size = env.SIMULATION_CACHE_SIZE, ttl = env.SIMULATION_CACHE_TTL) {
        super()
        this.maxSize = size
        this.ttl = ttl
        this.expiryMap = new Map()
    }

    override get(key: string): SimulationResult | undefined {
        const value = super.get(key)
        if (value === undefined) return undefined

        // LRU logic: Move to end by re-inserting
        super.delete(key)
        super.set(key, value)
        this.resetExpiration(key)

        return value
    }

    override set(key: string, value: SimulationResult): this {
        if (this.expiryMap.has(key)) this.clearExpiry(key)

        super.set(key, value)

        const timeoutId = setTimeout(() => this.delete(key), this.ttl)
        this.expiryMap.set(key, timeoutId)

        // Enforce maxSize by evicting the oldest entry if needed
        if (this.maxSize > 0 && this.size > this.maxSize) {
            const firstKey = this.keys().next().value
            if (firstKey) this.delete(firstKey)
        }

        return this
    }

    override delete(key: string): boolean {
        this.clearExpiry(key)
        return super.delete(key)
    }

    private resetExpiration(key: string): void {
        const expiry = this.expiryMap.get(key)
        if (!expiry) return

        clearTimeout(expiry)
        const newTimeoutId = setTimeout(() => this.delete(key), this.ttl)
        this.expiryMap.set(key, newTimeoutId)
    }

    private clearExpiry(key: string): void {
        const expiry = this.expiryMap.get(key)
        if (!expiry) return

        clearTimeout(expiry)
        this.expiryMap.delete(key)
    }
}
