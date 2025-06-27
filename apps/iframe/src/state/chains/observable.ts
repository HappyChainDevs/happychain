import { observable } from "@legendapp/state"
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage"
import { chainDefinitions as defaultChains } from "@happy.tech/wallet-common"
import { syncedCrud } from "@legendapp/state/sync-plugins/crud"
import { deploymentVar } from "#src/env.ts"
import { getUser } from "../user"
import type { AddEthereumChainParameter } from "viem"

const SYNC_SERVICE_URL = deploymentVar("VITE_SYNC_SERVICE_URL")

function getDefaultChainsRecord() {
    return Object.fromEntries(Object.entries(defaultChains).map(([_, chain]) => [chain.chainId, chain]))
}

export const chainsLegend = observable(
    syncedCrud({
        list: async ({ lastSync }) => {
            const user = getUser()
            if (!user) return []

            const response = await fetch(
                `${SYNC_SERVICE_URL}/api/v1/settings/list?type=Chain&user=${user.address}${lastSync ? `&lastUpdated=${lastSync}` : ""}`,
            )
            const data = await response.json()

            return data.data as AddEthereumChainParameter[]
        },
        create: async (data: AddEthereumChainParameter) => {
            const user = getUser()
            if (!user) return

            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    id: `${user.address}-${data.chainId}`,
                    type: "Chain",
                    user: user.address,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    deleted: false,
                }),
            })
            await response.json()
        },
        update: async (data: AddEthereumChainParameter) => {
            const user = getUser()
            if (!user) return

            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    id: `${user.address}-${data.chainId}`,
                    type: "Chain",
                    user: user.address,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    deleted: false,
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
        delete: async ({ chainId }) => {
            const user = getUser()
            if (!user) return

            const response = await fetch(`${SYNC_SERVICE_URL}/api/v1/settings/delete`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: `${user.address}-${chainId}` }),
            })
            await response.json()
        },
        persist: {
            plugin: ObservablePersistLocalStorage,
            name: "chains-legend",
            retrySync: true, // Retry sync after reload
        },
        initial: getDefaultChainsRecord(),
        fieldCreatedAt: "createdAt",
        fieldUpdatedAt: "updatedAt",
        fieldDeleted: "deleted",
        changesSince: "last-sync",
        updatePartial: true,
    }),
)

