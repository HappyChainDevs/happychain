import { createAccount } from "@happy.tech/submitter-client/lib"
import type { Address } from "viem"

export async function getBoopAccountAddress(owner: Address): Promise<Address> {
    const salt = "0x1"
    try {
        // TODO is this fast enough for login?
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
