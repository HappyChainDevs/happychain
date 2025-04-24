import { atomWithCompare } from "@happy.tech/common"
import { accessorsFromAtom } from "@happy.tech/common"
import { EIP1193DisconnectedError, type HappyUser } from "@happy.tech/wallet-common"
import { atom } from "jotai"
import { getAddress as checksumAddress } from "viem"
import { StorageKey, storage } from "../services/storage"

const userCompare = (a: HappyUser | undefined, b: HappyUser | undefined) => a?.uid === b?.uid
const initialUserValue = storage.get(StorageKey.HappyUser)

// Base atom for the user, wrapped by `userAtom` to provide a custom setter.
const baseUserAtom = atomWithCompare<HappyUser | undefined>(initialUserValue, userCompare)

export const userAtom = atom(
    (get) => get(baseUserAtom),
    (_get, set, newUser: HappyUser | undefined) => {
        if (newUser?.address) {
            const formattedUser = {
                ...newUser,
                controllingAddress: checksumAddress(newUser.controllingAddress),
                address: checksumAddress(newUser.address),
            }
            set(baseUserAtom, formattedUser)
            storage.set(StorageKey.HappyUser, formattedUser)
        } else {
            set(baseUserAtom, undefined)
            storage.remove(StorageKey.HappyUser)
        }
    },
)

export const { getValue: getUser, setValue: setUser } = accessorsFromAtom(userAtom)

/**
 * Returns the current user, throwing if not available.
 *
 * @throws EIP1193DisconnectedError if the user is unavailable
 */
export function getCheckedUser(): HappyUser {
    const user = getUser()
    checkUser(user)
    return user
}

/**
 * Checks that the user is defined.
 *
 * @throws EIP1193DisconnectedError if the user is unavailable
 */
export function checkUser(user: HappyUser | undefined): asserts user is HappyUser {
    if (!user) throw new EIP1193DisconnectedError()
}
