import type { Address } from "@happy.tech/common"
import { testClient } from "hono/testing"
import { CreateAccount } from "#lib/handlers/createAccount"
import { app } from "#lib/index" // import from index, not server, to start the services

/** Hono test client. */
export const apiClient = testClient(app)

/**
 * Deploys a boop account with the given owner an a salt of `0x1`.
 *
 * NOTE: This must be in this file, as it uses the apiClient, and we want the other utilities not to trigger the
 * start of the various services, so that they can be used in independent scripts.
 */
export async function createSmartAccount(owner: Address): Promise<Address> {
    const response = await apiClient.api.v1.accounts.create
        .$post({ json: { owner, salt: "0x1" } }) //
        .then((a) => a.json())
    if (response.status !== CreateAccount.Success) {
        console.error(response)
        throw new Error("could not create account")
    }
    return response.address
}
