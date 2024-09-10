import { getDefaultStore } from "jotai"
import type { Address, WatchAssetParameters } from "viem"
import { type UserWatchedAssetsRecord, watchedAssetsAtom } from "../../state/watchedAssets"

const store = getDefaultStore()

/**
 * Handles a Jotai atom that manages assets defined by the EIP-747 standard.
 *
 * EIP-747 specifies a standard for wallet applications to add assets (ERC-20)
 * to their watchlist, allowing users to easily track their balances and interactions with these assets.
 *
 * This module manages the `watchedAssetsAtom` which stores a list of assets the user has chosen to track.
 * The main operations include retrieving the current list of watched assets, adding a new asset to the list,
 * and clearing the list when required.
 */

/**
 * Retrieves the current list of watched assets from the Jotai store.
 */
export function getWatchedAssets(): UserWatchedAssetsRecord {
    return store.get(watchedAssetsAtom)
}

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
export function removeWatchedAsset(address: Address, assetAddress: Address): boolean {
    let assetRemoved = false
    store.set(watchedAssetsAtom, (prevAssets) => {
        const assetsForAddress = prevAssets[address] || []
        const updatedAssets = assetsForAddress.filter((asset) => asset.options.address !== assetAddress)
        assetRemoved = updatedAssets.length < assetsForAddress.length

        if (updatedAssets.length === 0) {
            const { [address]: _, ...remainingAssets } = prevAssets
            return remainingAssets
        }

        return {
            ...prevAssets,
            [address]: updatedAssets,
        }
    })
    return assetRemoved
}
