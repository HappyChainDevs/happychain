import { atomWithCompare } from "@happy.tech/common"
import { accessorsFromAtom } from "@happy.tech/common"
import type { HappyUser } from "@happy.tech/wallet-common"
import { atom } from "jotai"
import { getAddress } from "viem"
import { StorageKey, storage } from "../services/storage"

const userCompare = (a: HappyUser | undefined, b: HappyUser | undefined) => a?.uid === b?.uid
const initialUserValue = storage.get(StorageKey.HappyUser)

// Base atom for the user, wrapped by `userAtom` to provide a custom setter.
const baseUserAtom = atomWithCompare<HappyUser | undefined>(initialUserValue, userCompare)

export const userAtom = atom(
    (get) => get(baseUserAtom),
    (_get, set, newUser: HappyUser | undefined) => {
        if (newUser?.address) {
            const formattedUser = formatUser(newUser)
            set(baseUserAtom, formattedUser)
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
        controllingAddress: getAddress(user.controllingAddress),
        address: getAddress(user.address),
    }
}
