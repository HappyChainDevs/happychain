import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Address, WatchAssetParameters } from "viem"

export type UserWatchedAssetsRecord = Record<Address, WatchAssetParameters[]>

// === Atom Definition ==================================================================================

/**
 * Atom to manage watched assets mapped to user's address, using localStorage.
 */
export const watchedAssetsAtom = atomWithStorage<UserWatchedAssetsRecord>("watchedAssets", {}, undefined, {
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
 * If the asset does not already exist for the address, it's added.
 * Returns `true` if the asset was successfully added, or `false` if the asset was already in the list.
 */
export function addWatchedAsset(address: Address, newAsset: WatchAssetParameters): boolean {
    let assetExists = false
    store.set(watchedAssetsAtom, (prevAssets) => {
        const assetsForAddress = prevAssets[address] || []
        assetExists = assetsForAddress.some((asset) => asset.options.address === newAsset.options.address)

        return assetExists
            ? prevAssets
            : {
                  ...prevAssets,
                  [address]: [...assetsForAddress, newAsset],
              }
    })
    return !assetExists
}

/**
 * Removes a specific asset from the watched assets list by its contract address for a specific user.
 * Returns `true` if the asset was found and removed, or `false` if it was not in the list.
 */
export function removeWatchedAsset(assetAddress: Address, userAddress?: Address): boolean {
    if (!userAddress) {
        console.warn("User address not found")
        return false
    }
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
