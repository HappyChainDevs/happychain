import { atomWithStorage } from "jotai/utils"
import type { WatchAssetParameters } from "viem"

/**
 * Atom to manage watched assets using localStorage.
 *
 * This atom stores a list of ERC20 assets (following the EIP-747 standard) that the user is watching,
 * persisting the data using `localStorage` to ensure the watched assets remain available across sessions.
 */

export const watchedAssetsAtom = atomWithStorage<WatchAssetParameters[]>("watchedAssets", [])
