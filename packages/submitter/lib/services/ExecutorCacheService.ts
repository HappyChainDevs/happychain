import type { Account } from "viem/accounts"
import { ExecutorHeap } from "#lib/utils/ExecutorHeap"

interface Expiry {
    executor: { account: Account }
    hashExpirations: Map<`0x${string}`, NodeJS.Timeout>
}

export class ExecutorCacheService {
    constructor(
        /**
         * The time-to-live (TTL) for the cache in milliseconds. Default is 30 seconds.
         * Once an executorAccount is fetched for a given userAccount+nonceTrack, this
         * will remain the 'executor' for that combination until the TTL expires.
         * 30 seconds should provide ample time for a transaction to be submitted.
         *
         * The TTL is refreshed every time the executor is fetched, which occurs during 'submit'
         * so as long as the account submits a transaction within 30 seconds, the cache will always
         * return the same executor for this account+nonceTrack
         */
        accounts: Account[],
        private ttl = 30_000,
        private heap = new ExecutorHeap(),
        private expiryMap = new Map<string, Expiry>(),
    ) {
        for (const account of accounts) {
            this.registerExecutor(account)
        }
    }

    /**
     * Useful for debugging.
     */
    stats() {
        return this.heap.values.map((h) => ({ address: h.account.address, count: h.jobCount }))
    }

    /**
     * Registers a new Executor wallet onto the heap
     */
    registerExecutor(executor: Account): void {
        this.heap.add(executor)
    }

    /**
     * Returns the cached Executor for this account+nonceTrack combo. If there is no executor,
     * this will find the least used executor and add it to the cache mapping. If there already is
     * an executor it will return it, but first cancel the previous ttl, and create a new ttl
     * starting now, resulting in a rolling ttl per-hash
     */
    get(hash: `0x${string}`, account: string, nonceTrack: bigint): Account {
        const key = `${account}-${nonceTrack}`
        const expiry = this.expiryMap.get(key)

        if (!expiry) {
            const executor = this.createExpiry(hash, key)
            return executor
        }

        const executor = this.resetExpiry(hash, key, expiry)
        return executor
    }

    private createExpiry(hash: `0x${string}`, key: string): Account {
        // get the least used account
        const executor = this.heap.peek()
        // console.log({ executor })
        if (!executor) throw new Error("No available executors")
        this.heap.increment(executor.account.address)
        const hashExpirations = new Map([
            [
                hash,
                setTimeout(() => {
                    this.heap.decrement(executor.account.address)
                    this.expiryMap.get(key)?.hashExpirations.delete(hash)
                    if (!this.expiryMap.get(key)?.hashExpirations.size) {
                        this.expiryMap.delete(key)
                    }
                }, this.ttl),
            ],
        ])

        this.expiryMap.set(key, {
            executor: { account: executor.account },
            hashExpirations,
        })

        return executor.account
    }

    private resetExpiry(hash: `0x${string}`, key: string, expiry: Expiry): Account {
        // Check if the hash exists and reset its associated timeout
        if (expiry.hashExpirations.has(hash)) {
            const oldTimeoutId = expiry.hashExpirations.get(hash)!
            clearTimeout(oldTimeoutId)
        } else {
            // If this hash is new, increment the job count
            this.heap.increment(expiry.executor.account.address)
        }

        // Set a new timeout for this hash
        const newTimeoutId = setTimeout(() => {
            this.heap.decrement(expiry.executor.account.address)
            expiry.hashExpirations.delete(hash)
            if (!expiry.hashExpirations.size) {
                this.expiryMap.delete(key)
            }
        }, this.ttl)

        // Update the expiration entry for this hash
        expiry.hashExpirations.set(hash, newTimeoutId)

        return expiry.executor.account
    }
}
