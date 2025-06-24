import type { Address } from "@happy.tech/common"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { WalletPermission, WatchAssetParameters } from "viem"
import { StorageKey } from "#src/services/storage"
import { deploymentVar } from "#src/env.ts"
import { syncedCrud } from "@legendapp/state/sync-plugins/crud"
import { observable } from "@legendapp/state"
import { getUser } from "./user"
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage"

export type WatchedAsset = WatchAssetParameters & {
    user: Address
    id: string
    createdAt: number
    updatedAt: number
    deleted: boolean
}


const SYNC_SERVICE_URL = deploymentVar("VITE_SYNC_SERVICE_URL")
 
export const permissionsMapLegend = observable(
    syncedCrud({
        list: async ({ lastSync }) => {
            const user = getUser()
            if (!user) return []

            const response = await fetch(
                `${SYNC_SERVICE_URL}/api/v1/settings/list?type=ERC20&user=${user.address}${lastSync ? `&lastUpdated=${lastSync}` : ""}`,
            )
            const data = await response.json()

            return data.data as WatchedAsset[]
        },
        create: async (data: WatchedAsset) => {
            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })
            await response.json()
        },
        update: async (data: WatchedAsset) => {
            const user = getUser()
            if (!user) return

            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    type: "ERC20",
                    user: user.address,
                }),
            })
            await response.json()
        },
        subscribe: ({ refresh }) => {
            const user = getUser()
            if (!user) return () => {}

            console.log("Subscribing to updates for user", user.address)

            const eventSource = new EventSource(`${SYNC_SERVICE_URL}/api/v1/settings/subscribe?user=${user.address}`)
            eventSource.addEventListener("config.changed", (event) => {
                const data = JSON.parse(event.data)
                console.log("Received update", data)
                refresh()
            })

            return () => eventSource.close()
        },
        delete: async ({ id }) => {
            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/delete`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id }),
            })
            await response.json()
        },
        persist: {
            plugin: ObservablePersistLocalStorage,
            name: "watched-assets-legend",
            retrySync: true, // Retry sync after reload
        },
        initial: {},
        fieldCreatedAt: "createdAt",
        fieldUpdatedAt: "updatedAt",
        fieldDeleted: "deleted",
        changesSince: "last-sync",
        updatePartial: true,
    }),
)

// === State Accessors ==================================================================================

/**
 * Retrieves the current list of watched assets from the Jotai store.
 */
export function getWatchedAssets(): WatchedAsset[] {
    return Object.values(permissionsMapLegend.get())
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
    permissionsMapLegend[asset.id].set(asset)
    return true
}

/**
 * Removes a specific asset from the watched assets list by its contract address for a specific user.
 * Returns `true` if the asset was found and removed, or `false` if it was not in the list.
 */
export function removeWatchedAsset(assetAddress: Address): boolean {
    const asset = Object.values(permissionsMapLegend.get()).find((asset) => asset.options.address === assetAddress)
    if (!asset) return false
    permissionsMapLegend[asset.id].delete()
    return true
}
