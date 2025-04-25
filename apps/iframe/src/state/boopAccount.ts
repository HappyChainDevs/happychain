import { type Hex, accessorsFromAtom } from "@happy.tech/common"
import { type Atom, atom } from "jotai"
import type { Address } from "viem"
import { boopClient } from "./boopClient"
import { userAtom } from "./user"
import { walletClientAtom } from "./walletClient"

export interface BoopAccount {
    address: Address
    owner: Address
    salt: Hex
}

export async function fetchBoopAccount(address: Address): Promise<BoopAccount> {
    const result = await boopClient.createAccount({
        owner: address,
        salt: "0x1",
    })

    return result.unwrap()
}

export const boopAccountAtom: Atom<Promise<BoopAccount | undefined>> = atom(async (get) => {
    const wallet = get(walletClientAtom)
    const user = get(userAtom)

    if (!wallet?.account?.address || !user) return undefined

    try {
        return await fetchBoopAccount(wallet.account.address)
    } catch (error) {
        console.error("Boop account could not be created or retrieved:", error)
        return undefined
    }
})

export const { getValue: getBoopAccount } = accessorsFromAtom(boopAccountAtom)
