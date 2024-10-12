import { atomWithCompare } from "@happychain/common"
import { accessorsFromAtom } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import { atom } from "jotai"
import { getAddress } from "viem"
import { StorageKey, storage } from "../services/storage.ts"

// Base atom for the user, wrapped by `userAtom` to provide a custom setter.
// biome-ignore format: readability
const baseUserAtom = atomWithCompare<HappyUser | undefined>(
    undefined,
    (a, b) => a?.uid === b?.uid,
)

export const userAtom = atom(
    (get) => get(baseUserAtom),
    (_get, set, newUser: HappyUser | undefined) => {
        if (newUser?.address) {
            const formattedUser = formatUser(newUser)
            set(baseUserAtom, formattedUser)
            // share the user with the popup
            storage.set(StorageKey.HappyUser, newUser)
        } else {
            set(baseUserAtom, undefined)
            storage.remove(StorageKey.HappyUser)
        }
    },
)

export const { getValue: getUser, setValue: setUser } = accessorsFromAtom(userAtom)

function formatUser(user: HappyUser): HappyUser {
    return {
        ...user,
        address: getAddress(user.address),
        addresses: user.addresses.map(getAddress),
    }
}
