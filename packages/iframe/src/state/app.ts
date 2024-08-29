import { atom, getDefaultStore } from "jotai"

import { AuthState } from "@happychain/sdk-shared"
import { dappMessageBus } from "../services/eventBus"
import { storage } from "../services/storage"

const initialState = storage.get("cached-user") ? AuthState.Loading : AuthState.Unauthenticated
export const authStateAtom = atom<AuthState>(initialState)
authStateAtom.debugLabel = "authStateAtom"

const store = getDefaultStore()

dappMessageBus.emit("auth-state", store.get(authStateAtom))

store.sub(authStateAtom, () => {
    dappMessageBus.emit("auth-state", store.get(authStateAtom))
})
