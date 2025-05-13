import type { HappyUser } from "@happy.tech/wallet-common"
import { AuthState } from "@happy.tech/wallet-common"
import { getDefaultStore } from "jotai"
import type { EIP1193Provider } from "viem"
import { connectWagmi, disconnectWagmi } from "#src/wagmi/utils"
import { authStateAtom } from "../state/authState"
import { providerAtom } from "../state/provider"
import { userAtom } from "../state/user"

const store = getDefaultStore()

/**
 * Set the current user details along with the EIP 1193 Provider & auth state.
 *
 * If both user and provider are undefined, the intent is assumed to be a logout, and
 * we will additionally disconnect the internal wagmi provider before clearing the state.
 * If both are provided, the intent is assumed to be a login, and we will connect the internal wagmi
 * provider once the jotai atoms state is set.
 */
export async function setUserWithProvider(user: undefined, provider: undefined): Promise<void>
export async function setUserWithProvider(user: HappyUser, provider: EIP1193Provider): Promise<void>
export async function setUserWithProvider(user: HappyUser | undefined, provider: EIP1193Provider | undefined) {
    const isConnecting = Boolean(user && provider)

    if (!isConnecting) await disconnectWagmi()

    store.set(providerAtom, provider)
    store.set(userAtom, user)

    // user auth state
    store.set(authStateAtom, () => (isConnecting ? AuthState.Connected : AuthState.Disconnected))

    // if wagmi wasn't previously successfully connected, this throws
    if (isConnecting) await connectWagmi()
}
