import { atomWithCompareAndStorage } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import { AuthState } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/vanilla"
import { dappMessageBus } from "../services/eventBus"
import { authStateAtom } from "./app"
import { hasPermission } from "./permissions"

export const userAtom = atomWithCompareAndStorage<HappyUser | undefined>(
    "happychain:cached-user",
    undefined,
    (a, b) => a?.uid === b?.uid,
)
userAtom.debugLabel = "userAtom"

const store = getDefaultStore()

/**
 * This handles the case where the user was already logged in previously
 * but on page refresh firebase/web3auth/login-provider isn't yet initialized.
 * We don't pass the user to the dapp until everything is ready
 */
if (store.get(authStateAtom) === AuthState.Loading) {
    const unsub = store.sub(authStateAtom, () => {
        const user = store.get(userAtom)
        const permitted = hasPermission({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        // we sync all user changes to the dapp on auth-state changes
        if (!user || permitted) {
            dappMessageBus.emit("auth-changed", user)
        }
        unsub()
    })
}

store.sub(userAtom, () => {
    const user = store.get(userAtom)
    const permitted = hasPermission({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
    // we sync all logout events to the front end
    // and all login updates if the dapp has permissions
    if (!user || permitted) {
        dappMessageBus.emit("auth-changed", user)
    }
})
