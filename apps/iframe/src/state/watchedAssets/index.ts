import type { Address } from "@happy.tech/common"
import type { WatchAssetParameters } from "viem"
import { getUser } from "#src/state/user"
import { watchedAssetsMapLegend } from "./observable"
import type { WatchedAsset } from "./types"

// === State Accessors ==================================================================================

/**
 * Retrieves the current list of watched assets from the Jotai store.
 */
export function getWatchedAssets(): WatchedAsset[] {
    return Object.values(watchedAssetsMapLegend.get())
}

// === State Mutators ===================================================================================

/**
 * Adds a new asset to the store under the provided address.
 * If the asset does not already exist for the address, it is added.
 * Does nothing if the asset is already in the list.
 */
export function addWatchedAsset(newAsset: WatchAssetParameters): boolean {
    const user = getUser()
    if (!user) return false

    const asset: WatchedAsset = {
        ...newAsset,
        user: user.address,
        id: `${user.address}-${newAsset.options.address}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deleted: false,
    }
    watchedAssetsMapLegend[asset.id].set(asset)
    return true
}

/**
 * Removes a specific asset from the watched assets list by its contract address for a specific user.
 * Returns `true` if the asset was found and removed, or `false` if it was not in the list.
 */
export function removeWatchedAsset(assetAddress: Address): boolean {
    const asset = Object.values(watchedAssetsMapLegend.get()).find((asset) => asset.options.address === assetAddress)
    if (!asset) return false
    watchedAssetsMapLegend[asset.id].delete()
    return true
}
