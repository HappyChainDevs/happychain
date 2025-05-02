import { CreateAccount } from "@happy.tech/boop-sdk"
import type { Address } from "viem"
import { boopClient } from "#src/state/boopClient"

export async function getBoopAccountAddress(owner: Address): Promise<Address> {
    const salt = "0x1"
    try {
        // TODO is this fast enough for login?
        const result = await boopClient.createAccount({
            // already verifies if the account is created under the hood
            owner,
            salt,
        })

        const value = result.unwrap()
        if (value.status === CreateAccount.Success || value.status === CreateAccount.AlreadyCreated) {
            return value.address
        }

        throw value
    } catch (error) {
        console.error("Failed to create Boop account:", error)
        throw error
    }
}
