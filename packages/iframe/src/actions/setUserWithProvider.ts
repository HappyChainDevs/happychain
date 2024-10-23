import type { HappyUser } from "@happychain/sdk-shared"
import { AuthState } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import type { EIP1193Provider } from "viem"
import { authStateAtom } from "../state/authState"
import { clearAppPermissions } from "../state/permissions"
import { providerAtom } from "../state/provider"
import { userAtom } from "../state/user"
import { getAppURL, isStandaloneIframe } from "../utils/appURL"

const store = getDefaultStore()

export function setUserWithProvider(user: HappyUser | undefined, provider: EIP1193Provider | undefined) {
    store.set(providerAtom, provider)
    store.set(userAtom, user)

    // user auth state
    store.set(authStateAtom, () => (user ? AuthState.Connected : AuthState.Disconnected))

    // Clear all dapp permissions on logout.
    // TODO we actually don't want this, but it's very handy right now
    //      let's remove this once we can manage permissions in-UI
    if (!user && !isStandaloneIframe()) {
        clearAppPermissions(getAppURL())
    }
}
