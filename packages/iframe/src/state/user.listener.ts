import { AuthState } from "@happychain/sdk-shared"
import type { HappyUser } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import type { Atom } from "jotai/vanilla"
import { hasPermission } from "../services/permissions/hasPermission"
import { emitUserUpdate } from "../utils/emitUserUpdate"
import { authStateAtom } from "./authState"

export function initListeners<TAtom extends Atom<HappyUser | undefined>>(userAtom: TAtom) {
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
}
