import type { HappyUser } from "@happychain/sdk-shared"
import { AuthState } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import type { EIP1193Provider } from "viem"
import { clearPermissions } from "../services/permissions"
import { authStateAtom } from "../state/authState"
import { providerAtom } from "../state/provider"
import { userAtom } from "../state/user"

const store = getDefaultStore()

export function setUserWithProvider(user: HappyUser | undefined, provider: EIP1193Provider | undefined) {
    store.set(providerAtom, provider)
    store.set(userAtom, user)

    // user auth state
    store.set(authStateAtom, () => (user ? AuthState.Connected : AuthState.Disconnected))

    // clear all permissions on logout
    if (!user) {
        clearPermissions()
    }
}
