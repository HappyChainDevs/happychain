import { observable } from "@legendapp/state"
import { getUser } from "../user"
import { deploymentVar } from "#src/env.ts"
import { syncedCrud } from "@legendapp/state/sync-plugins/crud"
import type { WatchedAsset } from "./types"
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage"

const SYNC_SERVICE_URL = deploymentVar("VITE_SYNC_SERVICE_URL")
 
export const watchedAssetsMapLegend = observable(
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
            eventSource.addEventListener("config.changed", () => {
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
