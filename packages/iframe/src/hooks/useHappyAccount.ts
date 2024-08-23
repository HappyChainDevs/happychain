import { atomWithCompareAndStorage } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import { getDefaultStore, useAtomValue } from "jotai"
import type { EIP1193Provider } from "viem"

import { dappMessageBus } from "../services/eventBus"
import { providerAtom } from "../services/provider"
import { AuthState, authStateAtom } from "../state/app"

export const userAtom = atomWithCompareAndStorage<HappyUser | undefined>(
    "happychain:cached-user",
    undefined,
    (a, b) => a?.uid === b?.uid,
)
userAtom.debugLabel = "userAtom"

const store = getDefaultStore()

// we call manually once to broadcast to the dapp on load
dappMessageBus.emit("auth-changed", store.get(userAtom))

store.sub(userAtom, () => {
    // we sync all changes to the dapp
    dappMessageBus.emit("auth-changed", store.get(userAtom))
})

export function setUserWithProvider(user: HappyUser | undefined, provider: EIP1193Provider | undefined) {
    store.set(providerAtom, provider)
    store.set(userAtom, user)

    // user auth state
    store.set(authStateAtom, () => (user ? AuthState.Authenticated : AuthState.Unauthenticated))
}

export function useHappyAccount() {
    const user = useAtomValue(userAtom)

    return {
        user,
    }
}
