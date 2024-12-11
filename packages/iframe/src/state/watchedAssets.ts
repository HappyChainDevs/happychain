import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { type Address, type WatchAssetParameters, isAddress } from "viem"

/**
 * Represents the parameters for storing watched assets in a way that
 * overrides the default `address` field type in the `WatchAssetParameters.options`.
 *
 * This type is a modified version of the {@link WatchAssetParameters | WatchAssetParameters} type from the
 * `viem` library, specifically designed for use with local storage in the
 * context of managing user-watched assets. The key modifications include:
 *
 * - The `options` field is redefined to exclude the original `address` field
 *   (which is typically a string) and instead includes a new `address` field
 *   that is strictly typed as `Address`. This ensures that the address is
 *   validated and conforms to the expected format, enhancing type safety
 *   and reducing the risk of errors related to address handling.
 */
export type WatchAssetParametersForStorage = Omit<WatchAssetParameters, "options"> & {
    options: Omit<WatchAssetParameters["options"], "address"> & {
        address: Address
    }
}

export type UserWatchedAssetsRecord = Record<Address, WatchAssetParametersForStorage[]>

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
    if (!isAddress(newAsset.options.address)) {
        console.log("[wallet_watchAsset: addWatchedAsset]: address format incorrect; request failed")
        return false
    }

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
