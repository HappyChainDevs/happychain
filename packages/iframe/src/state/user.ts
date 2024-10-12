import { atomWithCompare } from "@happychain/common"
import { accessorsFromAtom } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import { atom } from "jotai"
import { getAddress } from "viem"

// NOTE: This used to be an `atomWithCompareAndStorage` but that doesn't seem to yield any benefits
// and did complexify the login logic. We can think about storing this again in the future after
// refactoring the login logic, if we see a benefit.

const storedUserAtom = atomWithCompare<HappyUser | undefined>(undefined, (a, b) => a?.uid === b?.uid)

export const userAtom = atom(
    (get) => get(storedUserAtom),
    (_get, set, newUser: HappyUser | undefined) => {
        if (newUser?.address) {
            set(storedUserAtom, formatUser(newUser))
        } else {
            set(storedUserAtom, undefined)
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
