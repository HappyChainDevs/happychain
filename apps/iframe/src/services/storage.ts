import { bigIntReplacer, bigIntReviver, createStorage } from "@happy.tech/common"
import type { HappyUser } from "@happy.tech/wallet-common"
import type { Address } from "abitype"
import type { Hash, Hex } from "viem"
import type { ExecuteOutput } from "../../../../packages/submitter/lib/tmp/interface/submitter_execute"

export enum StorageKey {
    HappyUser = "happychain:user:v1",
    Chains = "happychain:chains:v1",
    UserPermissions = "happychain:user_permissions:v1",
    UserOps = "happychain:user_ops:v1",
    WatchedAssets = "happychain:watched_assets:v1",
    LoadedAbis = "happychain:loaded_abis:v1",
    SessionKeys = "happychain:session_keys:v1",
    Boops = "happychain:boops:v1",
}

export type SessionKeysByTargetContract = Record<Address, Hex>
export type SessionKeysByHappyUser = Record<Address, SessionKeysByTargetContract>

export interface PendingBoop {
    boopHash: Hash
    value: bigint
    createdAt: number
    status: "submitted" | "confirmed" | "failed"
}

export interface ConfirmedBoop extends PendingBoop {
    status: "confirmed"
    receipt: ExecuteOutput
    confirmedAt: number
}

export interface FailedBoop extends PendingBoop {
    status: "failed"
    error?: {
        message: string
        code?: number | string
    }
    failedAt: number
}

export type BoopEntry = PendingBoop | ConfirmedBoop | FailedBoop

type StorageSchema = {
    // cache user within iframe to manage auto-reconnect
    [StorageKey.HappyUser]: HappyUser | undefined
    [StorageKey.SessionKeys]: SessionKeysByHappyUser | undefined
    [StorageKey.Boops]: Record<Address, Array<BoopEntry>> | undefined
}

export const storage = createStorage<StorageSchema>()

// biome-ignore lint/suspicious/noExplicitAny: let's not record the types for every version
const migrations: Record<string, (oldVal: any) => any> = {
    // Migration from UserOps to Boops if needed
    [StorageKey.UserOps]: (oldVal) => {
        // Convert UserOps to Boops format if needed
        // This is a placeholder for actual migration logic
        return oldVal
    },
}

function cleanOrMigrateStorage() {
    if (typeof window === "undefined") return

    for (const key of Object.keys(localStorage)) {
        const components = key.split(":")
        if (components.length === 3 && components[0] === "happychain") {
            const name = components[1]
            const version = components[2]
            const newKey = Object.values(StorageKey).find((k) => k.split(":")[1] === name)
            const newVersion = newKey?.split(":")[2]

            if (newKey && newVersion !== version) {
                const migrate = migrations[key]
                if (migrate) {
                    console.log(`migrating happychain:${name} from ${version} to ${newVersion}`)
                    const oldVal = JSON.parse(localStorage[key], bigIntReviver)
                    localStorage[newKey] = JSON.stringify(migrate(oldVal), bigIntReplacer)
                    delete localStorage[key]
                } else {
                    console.warn(
                        `storage happychain:${name} updated from ${version} to ${newVersion}, removing old version`,
                    )
                    delete localStorage[key]
                }
            }
        }
    }
}

cleanOrMigrateStorage()
