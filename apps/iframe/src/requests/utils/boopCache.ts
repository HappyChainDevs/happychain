import type { Boop, BoopReceipt } from "@happy.tech/boop-sdk"
import { FIFOCache } from "@happy.tech/common"
import type { Hash } from "viem"

export type BoopCacheEntry = {
    boop?: Boop
    receipt?: BoopReceipt
}

/** Cache Boop receipts - store both the receipt & original transaction */
export const boopCache = new FIFOCache<Hash, BoopCacheEntry>(100)
