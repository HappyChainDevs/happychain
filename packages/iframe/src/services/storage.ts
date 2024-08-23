import { createStorage } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"

// cache user within iframe to manage auto-reconnect
type StorageSchema = { "cached-user": HappyUser | undefined }

export const storage = createStorage<StorageSchema>("happychain")
