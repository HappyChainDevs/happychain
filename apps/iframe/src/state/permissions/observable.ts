import { observable } from "@legendapp/state"
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage"
import { syncedCrud } from "@legendapp/state/sync-plugins/crud"
import { deploymentVar } from "#src/env.ts"
import { getUser } from "../user"
import type { WalletPermission } from "./types"

const SYNC_SERVICE_URL = deploymentVar("VITE_SYNC_SERVICE_URL")

export const permissionsMapLegend = observable(
    syncedCrud({
        list: async ({ lastSync }) => {
            const user = getUser()
            if (!user) return []

            const response = await fetch(
                `${SYNC_SERVICE_URL}/api/v1/settings/list?type=WalletPermissions&user=${user.address}${lastSync ? `&lastUpdated=${lastSync}` : ""}`,
            )
            const data = await response.json()

            return data.data as WalletPermission[]
        },
        create: async (data: WalletPermission) => {
            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })
            await response.json()
        },
        update: async (data: WalletPermission) => {
            const user = getUser()
            if (!user) return

            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    type: "WalletPermissions",
                    user: user.address,
                }),
            })
            await response.json()
        },
        subscribe: ({ refresh }) => {
            const user = getUser()
            if (!user) return
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
            name: "config-legend",
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
