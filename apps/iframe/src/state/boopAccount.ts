import { accessorsFromAtom } from "@happy.tech/common"
import { createAccount } from "@happy.tech/submitter-client"
import { type Atom, atom } from "jotai"
import type { Address } from "viem"
import { userAtom } from "./user"
import { walletClientAtom } from "./walletClient"

export interface BoopAccount {
    address: Address
    owner: Address
}

export async function getBoopAccountAddress(owner: Address): Promise<Address> {
    const salt = "0x1"
    try {
        const result = await createAccount({
            // already verifies if the account is created under the hood
            owner,
            salt,
        })

        if (result.isErr()) {
            throw result.error
        }

        return result.value.address
    } catch (error) {
        console.error("Failed to create Boop account:", error)
        throw error
    }
}

export const boopAccountAtom: Atom<Promise<BoopAccount | undefined>> = atom(async (get) => {
    const wallet = get(walletClientAtom)
    const user = get(userAtom)

    if (!wallet?.account || !user) return undefined

    const ownerAddress = wallet.account.address

    try {
        const accountAddress = await getBoopAccountAddress(ownerAddress)

        return {
            address: accountAddress,
            owner: ownerAddress,
        }
    } catch (error) {
        console.error("Boop account could not be created or retrieved:", error)
        return undefined
    }
})

export const { getValue: getBoopAccount } = accessorsFromAtom(boopAccountAtom)
