import type { HappyUser } from "@happychain/sdk-shared"
import { AuthState } from "@happychain/sdk-shared"
import { getDefaultStore, useAtomValue } from "jotai"
import type { EIP1193Provider } from "viem"
import { providerAtom } from "../services/provider"
import { authStateAtom } from "../state/app"
import { userAtom } from "../state/user"

const store = getDefaultStore()

export function setUserWithProvider(user: HappyUser | undefined, provider: EIP1193Provider | undefined) {
    console.log("Setting user with provider...", user)
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
