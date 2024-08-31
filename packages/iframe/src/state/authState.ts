import { atom, getDefaultStore } from "jotai"

import { AuthState } from "@happychain/sdk-shared"
import { dappMessageBus } from "../services/eventBus"
import { hasPermission } from "../services/permissions/hasPermission"
import { StorageKey, storage } from "../services/storage"
import { emitUserUpdate } from "../utils/emitUserUpdate"
import { userAtom } from "./user"

const initialState = storage.get(StorageKey.HappyUser) ? AuthState.Connecting : AuthState.Disconnected

export const authStateAtom = atom<AuthState>(initialState)
authStateAtom.debugLabel = "authStateAtom"

const store = getDefaultStore()

dappMessageBus.emit("auth-state", store.get(authStateAtom))

store.sub(authStateAtom, () => {
    dappMessageBus.emit("auth-state", store.get(authStateAtom))

    const permitted = hasPermission({ eth_accounts: {} })
    if (permitted) {
        const user = store.get(userAtom)
        // we sync all logout events to the front end
        // and all login updates if the dapp has permissions
        if (!user || permitted) {
            emitUserUpdate(user)
        }
    }
})
