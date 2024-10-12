import type { Msgs, ProviderMsgsFromApp } from "@happychain/sdk-shared"
import { requiresApproval } from "@happychain/sdk-shared"
import { hasPermissions } from "../services/permissions"
import { getChains } from "../state/chains"
import { getUser } from "../state/user"
import { getDappOrigin } from "./getDappOrigin"

export function checkIfRequestRequiresConfirmation(
    payload: ProviderMsgsFromApp[Msgs.PermissionCheckRequest]["payload"],
) {
    const basicCheck = requiresApproval(payload)
    // if the basic check shows its a safe method, we can stop here,
    // and report back that no confirmation is needed
    if (!basicCheck) {
        return false
    }

    // if its a restricted method, and the user is
    // not logged in, then it needs confirmation
    // always (login screen or request permissions)
    if (!getUser()?.address) {
        return true
    }

    switch (payload.method) {
        // users don't need to confirm if they are adding a chain thats already been added
        // (it won't get added again though)
        case "wallet_addEthereumChain":
            return !getChains().some((chain) => chain.chainId === payload.params[0].chainId)

        // users don't need to confirm if they are requesting to add permissions that have already been authorized
        // just current permissions are returned as a result instead
        // TODO: need to pass origin to check from iframe?
        case "wallet_requestPermissions":
            return !hasPermissions(payload.params[0], { origin: getDappOrigin() })
        case "eth_requestAccounts":
            return !hasPermissions("eth_accounts", { origin: getDappOrigin() })
    }

    return true
}
