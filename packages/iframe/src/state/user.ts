import { atomWithCompareAndStorage } from "@happychain/common"
import { accessorsFromAtom } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import { atom } from "jotai"
import { getAddress } from "viem"
import { StorageKey } from "../services/storage"

const storedUserAtom = atomWithCompareAndStorage<HappyUser | undefined>(
    StorageKey.HappyUser,
    undefined,
    (a, b) => a?.uid === b?.uid,
)

export const userAtom = atom(
    (get) => get(storedUserAtom),
    (_get, set, newUser: HappyUser | undefined) => {
        if (newUser?.address) {
            set(storedUserAtom, validateUser(newUser))
        } else {
            set(storedUserAtom, undefined)
        }
    },
)

export const { getValue: getUser, setValue: setUser } = accessorsFromAtom(userAtom)

function validateUser(user: HappyUser): HappyUser {
    return {
        ...user,
        address: getAddress(user.address),
        addresses: user.addresses.map(getAddress),
    }
}
