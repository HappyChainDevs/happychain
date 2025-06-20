import { CreateAccount } from "@happy.tech/boop-sdk"
import type { Address } from "@happy.tech/common"
import { getBoopClient } from "#src/state/boopClient"
import { reqLogger } from "#src/utils/logger"

export async function getBoopAccountAddress(owner: Address): Promise<Address> {
    const salt = "0x1"
    try {
        const boopClient = getBoopClient()
        const result = await boopClient.createAccount({
            // already verifies if the account is created under the hood
            owner,
            salt,
        })

        reqLogger.trace("accounts/create output", result)

        if (result.status === CreateAccount.Success || result.status === CreateAccount.AlreadyCreated) {
            return result.address
        }

        throw result
    } catch (error) {
        reqLogger.error("Failed to create Boop account:", error)
        throw error
    }
}
