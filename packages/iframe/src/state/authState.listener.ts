import type { AuthState } from "@happychain/sdk-shared"
import { type Atom, getDefaultStore } from "jotai"
import { dappMessageBus } from "../services/eventBus"

export function initListeners<TAtom extends Atom<AuthState>>(authStateAtom: TAtom) {
    const store = getDefaultStore()

    dappMessageBus.emit("auth-state", store.get(authStateAtom))

    store.sub(authStateAtom, () => {
        dappMessageBus.emit("auth-state", store.get(authStateAtom))
    })
}
