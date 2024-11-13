import { atomWithCompare } from "@happychain/common"
import { accessorsFromAtom } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import { atom } from "jotai"
import { getAddress } from "viem"
import { StorageKey, storage } from "../services/storage.ts"

type OptionalUser = HappyUser | undefined
const userCompare = (a: OptionalUser, b: OptionalUser) => a?.uid === b?.uid
const initialUserValue = undefined

// Base atom for the user, wrapped by `userAtom` to provide a custom setter.
const baseUserAtom = atomWithCompare<OptionalUser>(initialUserValue, userCompare)

export const userAtom = atom(
    (get) => get(baseUserAtom),
    (_get, set, newUser: OptionalUser) => {
        if (newUser?.address) {
            const formattedUser = formatUser(newUser)
            set(baseUserAtom, formattedUser)
            // share the user with the popup
            storage.set(StorageKey.HappyUser, formattedUser)
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
