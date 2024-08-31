import { atomWithCompareAndStorage } from "@happychain/common"
import { AuthState, type HappyUser } from "@happychain/sdk-shared"

import { getDefaultStore } from "jotai"
import { hasPermission } from "../services/permissions/hasPermission"
import { StorageKey } from "../services/storage"
import { emitUserUpdate } from "../utils/emitUserUpdate"
import { authStateAtom } from "./authState"

export const userAtom = atomWithCompareAndStorage<HappyUser | undefined>(
    StorageKey.HappyUser,
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
if (store.get(authStateAtom) === AuthState.Connecting) {
    const unsub = store.sub(authStateAtom, () => {
        const user = store.get(userAtom)
        const permitted = hasPermission({ eth_accounts: {} })
        // we sync all user changes to the dapp on auth-state changes
        if (!user || permitted) {
            emitUserUpdate(user)
        }
        unsub()
    })
}

store.sub(userAtom, () => {
    const user = store.get(userAtom)
    const permitted = hasPermission({ eth_accounts: {} })

    // we sync all logout events to the front end
    // and all login updates if the dapp has permissions
    if (!user || permitted) {
        emitUserUpdate(user)
    }
})
