import { bigIntReplacer, bigIntReviver, createStorage } from "@happy.tech/common"
import type { Address, Hex } from "@happy.tech/common"
import type { HappyUser } from "@happy.tech/wallet-common"
import type { StoredBoop } from "#src/state/boopHistory"

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

type StorageSchema = {
    // cache user within iframe to manage auto-reconnect
    [StorageKey.HappyUser]: HappyUser | undefined
    [StorageKey.SessionKeys]: SessionKeysByHappyUser | undefined
    [StorageKey.Boops]: Record<Address, Array<StoredBoop>> | undefined
}

export const storage = createStorage<StorageSchema>({
    reviver: bigIntReviver,
    replacer: bigIntReplacer,
})

// biome-ignore lint/suspicious/noExplicitAny: let's not record the types for every version
const migrations: Record<string, (oldVal: any) => any> = {}

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
