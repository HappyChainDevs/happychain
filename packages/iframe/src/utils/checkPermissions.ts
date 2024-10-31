import type { Msgs, ProviderMsgsFromApp } from "@happychain/sdk-shared"
import { requiresApproval } from "@happychain/sdk-shared"
import { hasPermissions } from "#src/state/permissions.ts"
import { getChains } from "../state/chains"
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
        // Users don't need to approve adding a chain that has already been added
        // (this won't result in a duplicated chain).
        case "wallet_addEthereumChain":
            return !getChains()[payload.params[0].chainId]

        // Users don't need to approve permissions that have already been granted.
        case "wallet_requestPermissions":
            return !hasPermissions(app, payload.params[0])

        case "eth_requestAccounts":
            return !hasPermissions(app, "eth_accounts")
    }

    return true
}
