import { createStorage } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import type { Address } from "abitype"
import type { Hex } from "viem"

export enum StorageKey {
    HappyUser = "happychain:user:v1",
    Chains = "happychain:chains:v1",
    UserPermissions = "happychain:user_permissions:v1",
    ConfirmedTxs = "happychain:confirmed_txs:v1",
    PendingTxs = "happychain:pending_txs:v1",
    PendingUserOps = "happychain:pending_userops:v1",
    ConfirmedUserOps = "happychain:confirmed_userops:v1",
    WatchedAssets = "happychain:watched_assets:v1",
    LoadedAbis = "happychain:loaded_abis:v1",
    SessionKeys = "happychain:session_keys:v1",
}

export type SessionKeysByTargetContract = Record<Address, Hex>
export type SessionKeysByHappyUser = Record<Address, SessionKeysByTargetContract>

type StorageSchema = {
    // cache user within iframe to manage auto-reconnect
    [StorageKey.HappyUser]: HappyUser | undefined
    [StorageKey.SessionKeys]: SessionKeysByHappyUser | undefined
}

export const storage = createStorage<StorageSchema>()

// biome-ignore lint/suspicious/noExplicitAny: let's not record the types for every version
const migrations: Record<string, (oldVal: any) => any> = {}

function cleanOrMigrateStorage() {
    if (typeof window === "undefined") return

    for (const [key, value] of Object.entries(localStorage)) {
        const components = value.split(":")
        if (components.length === 3 && components[0] === "happychain") {
            const name = components[1]
            const version = components[2]
            const newKey = Object.keys(StorageKey).find((k) => k.split(":")[1] === name)
            const newVersion = newKey?.split(":")[2]

            if (newKey && newVersion !== version) {
                const migrate = migrations[key]
                migrate ? localStorage.setItem(newKey, migrate(localStorage.get(key))) : localStorage.removeItem(key)
            }
        }
    }
}

cleanOrMigrateStorage()
