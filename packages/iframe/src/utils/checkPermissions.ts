import type { Msgs, ProviderMsgsFromApp } from "@happychain/sdk-shared"
import { requiresApproval } from "@happychain/sdk-shared"
import { hasPermissions } from "#src/state/permissions.ts"
import { getChains, getCurrentChain } from "../state/chains"
import { getUser } from "../state/user"
import type { AppURL } from "./appURL.ts"

export function checkIfRequestRequiresConfirmation(
    app: AppURL,
    payload: ProviderMsgsFromApp[Msgs.PermissionCheckRequest]["payload"],
) {
    const neverRequiresApproval = !requiresApproval(payload)

    // Never requires approval, no need to look at the permissions.
    if (neverRequiresApproval) {
        return false
    }

    // If the user isn't logged in, user intervention is always needed to log in.
    if (!getUser()?.address) {
        return true
    }

    switch (payload.method) {
        // Users don't need to approve permissions that have already been granted.

        case "wallet_requestPermissions":
            return !hasPermissions(app, payload.params[0])

        case "eth_requestAccounts":
            return !hasPermissions(app, "eth_accounts")

        case "wallet_switchEthereumChain":
            // Doesn't need permission to "switch" to the current chain. Request will be a no-op.
            return getCurrentChain().chainId !== payload.params[0].chainId

        case "wallet_addEthereumChain": {
            // Users don't need to approve adding a chain that has already been added.
            // Request will be a no-op.
            const existingChainJSON = JSON.stringify(getChains()[payload.params[0].chainId])
            const newChainJSON = JSON.stringify(payload.params[0])
            return existingChainJSON !== newChainJSON
        }
    }

    return true
}
