import { atomWithCompareAndStorage } from "@happychain/common"
import { accessorsFromAtom } from "@happychain/common/lib/utils/jotai"
import type { HappyUser } from "@happychain/sdk-shared"
import { StorageKey } from "../services/storage"

export const userAtom = atomWithCompareAndStorage<HappyUser | undefined>(
    StorageKey.HappyUser,
    undefined,
    (a, b) => a?.uid === b?.uid,
)

export const { getValue: getUser, setValue: setUser } = accessorsFromAtom(userAtom)
