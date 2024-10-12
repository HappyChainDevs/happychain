import type { HTTPString } from "@happychain/common"
import type { Msgs, ProviderMsgsFromApp } from "@happychain/sdk-shared"
import { requiresApproval } from "@happychain/sdk-shared"
import { hasPermissions } from "../services/permissions"
import { getChains } from "../state/chains"
import { getUser } from "../state/user"
import { getDappOrigin } from "./getDappOrigin.ts"

export function checkIfRequestRequiresConfirmation(
    payload: ProviderMsgsFromApp[Msgs.PermissionCheckRequest]["payload"],
    origin: HTTPString = getDappOrigin(),
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
        // (this won't result in duplicate chain).
        case "wallet_addEthereumChain":
            return !getChains().some((chain) => chain.chainId === payload.params[0].chainId)

        // Users don't need to approve permissions that have already been granted.
        case "wallet_requestPermissions":
            return !hasPermissions(payload.params[0], { origin })

        case "eth_requestAccounts":
            return !hasPermissions("eth_accounts", { origin })
    }

    return true
}
