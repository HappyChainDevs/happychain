import { atomWithStorage } from "jotai/utils"
import type { Address, WatchAssetParameters } from "viem"

/**
 * Atom to manage watched assets mapped to user's address, using localStorage.
 */

export type UserWatchedAssetsRecord = Record<Address, WatchAssetParameters[]>

export const watchedAssetsAtom = atomWithStorage<UserWatchedAssetsRecord>("watchedAssets", {})
