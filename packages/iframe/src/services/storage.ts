import { createStorage } from "@happychain/common";
import type { HappyUser } from "@happychain/core";

// cache user within iframe to manage auto-reconnect
type StorageSchema = { "cached-user": HappyUser | null };

export const storage = createStorage<StorageSchema>("happychain");
