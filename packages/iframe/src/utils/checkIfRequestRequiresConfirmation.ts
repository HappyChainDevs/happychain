import { HappyMethodNames, PermissionNames } from "@happychain/common"
import type { Msgs, ProviderMsgsFromApp } from "@happychain/sdk-shared"
import { requiresApproval } from "@happychain/sdk-shared"
import type { Address } from "viem/accounts"
import { type SessionKeysByHappyUser, StorageKey, storage } from "#src/services/storage"
import { hasPermissions } from "#src/state/permissions"
import { getChains, getCurrentChain } from "../state/chains"
import { getUser } from "../state/user"
import type { AppURL } from "./appURL"

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

        case "eth_sendTransaction":
            return !hasPermissions(app, {
                [PermissionNames.SESSION_KEY]: { target: payload.params[0].to },
            })

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
            const targetAddress = payload.params[0] as Address
            const storedSessionKeys = storage.get(StorageKey.SessionKeys) as SessionKeysByHappyUser
            const user = getUser()

            // Needs approval if either :
            // 1. No permission exists for this contract
            // 2. No session key exists for this contract
            return (
                !hasPermissions(app, {
                    [PermissionNames.SESSION_KEY]: {
                        target: targetAddress,
                    },
                }) || !storedSessionKeys?.[user!.address]?.[targetAddress]
            )
        }
    }

    return true
}
