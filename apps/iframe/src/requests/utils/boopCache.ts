import type { Boop, BoopReceipt } from "@happy.tech/boop-sdk"
import { FIFOCache } from "@happy.tech/common"
import type { Hash } from "@happy.tech/common"

export type BoopCacheEntry = {
    boop?: Boop
    receipt?: BoopReceipt
}

class BoopCache extends FIFOCache<Hash, BoopCacheEntry> {
    putBoop(hash: Hash, boop: Boop): BoopCacheEntry {
        let entry = this.get(hash)
        if (entry) {
            entry.boop = boop
        } else {
            entry = { boop }
            this.put(hash, entry)
        }
        return entry
    }
    putReceipt(hash: Hash, receipt: BoopReceipt): BoopCacheEntry {
        let entry = this.get(hash)
        if (entry) {
            entry.receipt = receipt
        } else {
            entry = { receipt }
            this.put(hash, entry)
        }
        return entry
    }
}

/** Cache Boop receipts - store both the receipt & original transaction */
export const boopCache = new BoopCache(100)
