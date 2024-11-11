import type { HappyUser } from "@happychain/sdk-shared"
import { AuthState } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import type { EIP1193Provider } from "viem"
import { authStateAtom } from "#src/state/authState"
import { createKernelAccount } from "#src/state/kernelAccount"
import { providerAtom } from "#src/state/provider"
import { userAtom } from "#src/state/user"

const store = getDefaultStore()

export async function setUserWithProvider(user: HappyUser | undefined, provider: EIP1193Provider | undefined) {
    store.set(providerAtom, provider)
    if (user) {
        const kernelAccount = await createKernelAccount(user.address)
        const smartAccountAddress = kernelAccount?.address

        if (smartAccountAddress) {
            const userWithSmartAccount: HappyUser = {
                ...user,
                controllingAddress: user.address,
                address: smartAccountAddress,
                addresses: [smartAccountAddress, user.address],
                name: `${smartAccountAddress.slice(0, 6)}...${smartAccountAddress.slice(-4)}`,
            }
            store.set(userAtom, userWithSmartAccount)
        } else {
            console.error("Failed to create smart account")
            store.set(userAtom, {
                ...user,
                address: undefined,
                controllingAddress: user.address,
            })
        }
    } else {
        store.set(userAtom, undefined)
    }

    // user auth state
    store.set(authStateAtom, () => (user ? AuthState.Connected : AuthState.Disconnected))
}
