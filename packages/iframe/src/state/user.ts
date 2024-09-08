import { atomWithCompareAndStorage } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import { StorageKey } from "../services/storage"

export const userAtom = atomWithCompareAndStorage<HappyUser | undefined>(
    StorageKey.HappyUser,
    undefined,
    (a, b) => a?.uid === b?.uid,
)
