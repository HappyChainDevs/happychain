import { createStorage } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"

export enum StorageKey {
    HappyUser = "happychain:user",
    Chains = "happychain:supported_chains",
    UserPermissions = "happychain:user_permissions",
    PendingTxs = "happychain:pending_txs",
    TxHistory = "happychain:tx_history",
}

// cache user within iframe to manage auto-reconnect
type StorageSchema = {
    [StorageKey.HappyUser]: HappyUser | undefined
}

export const storage = createStorage<StorageSchema>()
