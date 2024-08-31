import { createStorage } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"

export enum StorageKey {
    HappyUser = "happychain:cached-user",
    Chains = "supported:chains",
    UserPermissions = "user_permissions_per_domain",
}

// cache user within iframe to manage auto-reconnect
type StorageSchema = {
    [StorageKey.HappyUser]: HappyUser | undefined
}

export const storage = createStorage<StorageSchema>()
