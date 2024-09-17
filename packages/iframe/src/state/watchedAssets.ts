import { atomWithStorage } from "jotai/utils"
import type { Address, WatchAssetParameters } from "viem"

export type UserWatchedAssetsRecord = Record<Address, WatchAssetParameters[]>

/**
 * Atom to manage watched assets mapped to user's address, using localStorage.
 */
export const watchedAssetsAtom = atomWithStorage<UserWatchedAssetsRecord>("watchedAssets", {})
