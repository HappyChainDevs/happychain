import type { Address } from "@happy.tech/common"
import { testClient } from "hono/testing"
import { CreateAccount } from "#lib/handlers/createAccount"
import { app } from "#lib/server"

/** Hono test client. */
export const client = testClient(app)

export async function createSmartAccount(owner: Address): Promise<Address> {
    const response = await client.api.v1.accounts.create
        .$post({ json: { owner, salt: "0x1" } }) //
        .then((a) => a.json())
    if (response.status !== CreateAccount.Success) {
        console.error(response)
        throw new Error("could not create account")
    }
    return response.address
}
