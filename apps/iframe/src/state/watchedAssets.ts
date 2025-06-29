import type { Address } from "@happy.tech/common"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { WatchAssetParameters } from "viem"
import { StorageKey } from "#src/services/storage"

export type UserWatchedAssetsRecord = Record<Address, WatchAssetParameters[]>

// === Atom Definition ==================================================================================

/**
 * Atom to manage watched assets mapped to user's address, using localStorage.
 */
export const watchedAssetsAtom = atomWithStorage<UserWatchedAssetsRecord>(StorageKey.WatchedAssets, {}, undefined, {
    getOnInit: true,
})

// Store Instantiation
const store = getDefaultStore()

// === State Accessors ==================================================================================

/**
 * Retrieves the current list of watched assets from the Jotai store.
 */
export function getWatchedAssets(): UserWatchedAssetsRecord {
    return store.get(watchedAssetsAtom)
}

// === State Mutators ===================================================================================

/**
 * Adds a new asset to the store under the provided address.
 * If the asset does not already exist for the address, it is added.
 * Does nothing if the asset is already in the list.
 */
export function addWatchedAsset(userAddress: Address, newAsset: WatchAssetParameters): boolean {
    store.set(watchedAssetsAtom, (prevAssets) => {
        const assetsForAddress = prevAssets[userAddress] || []
        const assetExists = assetsForAddress.some((asset) => asset.options.address === newAsset.options.address)

        return assetExists
            ? prevAssets
            : {
                  ...prevAssets,
                  [userAddress]: assetsForAddress.concat(newAsset),
              }
    })

    return true
}

/**
 * Removes a specific asset from the watched assets list by its contract address for a specific user.
 * Returns `true` if the asset was found and removed, or `false` if it was not in the list.
 */
export function removeWatchedAsset(userAddress: Address, assetAddress: Address): boolean {
    let assetRemoved = false
    store.set(watchedAssetsAtom, (prevAssets) => {
        const assetsForAddress = prevAssets[userAddress] || []
        const updatedAssets = assetsForAddress.filter((asset) => asset.options.address !== assetAddress)
        assetRemoved = updatedAssets.length < assetsForAddress.length

        if (updatedAssets.length === 0) {
            const { [userAddress]: _, ...remainingAssets } = prevAssets
            return remainingAssets
        }

        return {
            ...prevAssets,
            [userAddress]: updatedAssets,
        }
    })
    return assetRemoved
}
