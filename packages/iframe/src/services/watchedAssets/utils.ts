import { getDefaultStore } from "jotai"
import type { Address, WatchAssetParameters } from "viem"
import { watchedAssetsAtom } from "../../state/watchedAssets"

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
export function getWatchedAssets(): WatchAssetParameters[] {
    return store.get(watchedAssetsAtom)
}

/**
 * Adds a new asset to the store if it does not already exist. Returns `true` if
 * the asset was successfully added, or `false` if the asset was already in the list.
 */
export function setNewWatchedAsset(newAsset: WatchAssetParameters): boolean {
    let assetAdded = false

    store.set(watchedAssetsAtom, (prevAssets) => {
        const assetExists = prevAssets.some((asset) => asset.options.address === newAsset.options.address)

        if (!assetExists) {
            const updatedAssets = [...prevAssets, newAsset]
            assetAdded = true
            return updatedAssets
        }

        return prevAssets
    })

    return assetAdded
}

/**
 * Removes a specific asset from the watched assets list by its contract address.
 * Returns `true` if the asset was found and removed, or `false` if it was not in the list.
 */
export function removeWatchedAsset(address: Address): boolean {
    let assetRemoved = false

    store.set(watchedAssetsAtom, (prevAssets) => {
        const updatedAssets = prevAssets.filter((asset) => asset.options.address !== address)

        if (updatedAssets.length !== prevAssets.length) {
            assetRemoved = true
        }

        return updatedAssets
    })

    return assetRemoved
}

/**
 * Clears all watched assets from the store, resetting the atom to an empty array.
 */
export function clearWatchedAssets(): void {
    store.set(watchedAssetsAtom, [])
}
