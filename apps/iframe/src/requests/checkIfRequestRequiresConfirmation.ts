import { HappyMethodNames } from "@happy.tech/common"
import type { Msgs, ProviderMsgsFromApp } from "@happy.tech/wallet-common"
import { requiresApproval } from "@happy.tech/wallet-common"
import { PermissionName } from "#src/constants/permissions"
import { checkAndChecksumAddress, hasNonZeroValue } from "#src/requests/utils/checks"
import { type SessionKeysByHappyUser, StorageKey, storage } from "#src/services/storage"
import { hasPermissions } from "#src/state/permissions"
import { getChains, getCurrentChain } from "../state/chains"
import { getUser } from "#src/state/user"
import type { AppURL } from "#src/utils/appURL"

export function checkIfRequestRequiresConfirmation(
    app: AppURL,
    payload: ProviderMsgsFromApp[Msgs.PermissionCheckRequest]["payload"],
): boolean {
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
        case "wallet_sendTransaction":
        case "eth_sendTransaction": {
            const tx = payload.params[0]
            if (hasNonZeroValue(tx)) return true
            return !hasPermissions(app, { [PermissionName.SessionKey]: { target: tx.to } })
        }

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

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            const targetAddress = checkAndChecksumAddress(payload.params[0])
            const storedSessionKeys = storage.get(StorageKey.SessionKeys) as SessionKeysByHappyUser
            const user = getUser()

            // Needs approval if either :
            // 1. No permission exists for this contract
            // 2. No session key exists for this contract
            return (
                !hasPermissions(app, {
                    [PermissionName.SessionKey]: {
                        target: targetAddress,
                    },
                }) || !storedSessionKeys?.[user!.address]?.[targetAddress]
            )
        }
    }

    return true
}
