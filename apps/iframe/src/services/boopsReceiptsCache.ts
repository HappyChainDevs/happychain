import type { Boop, BoopReceipt } from "@happy.tech/boop-sdk"
import { FIFOCache } from "@happy.tech/common"
import type { Hash } from "viem"

/** Cache Boop receipts - store both the receipt & original transaction */
export const boopReceiptsCache = new FIFOCache<Hash, { receipt: BoopReceipt; tx?: Boop }>(100)
