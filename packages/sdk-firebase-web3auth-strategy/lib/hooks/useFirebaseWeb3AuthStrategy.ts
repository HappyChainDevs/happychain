import { useMemo } from "react"

import type { ConnectionProvider, HappyUser } from "@happychain/sdk-shared"
import type { EIP1193Provider } from "viem"

import { googleLogo } from "../logos"

import { useFirebaseAuth } from "./useFirebaseAuth"

export function useFirebaseWeb3AuthStrategy(): {
    providers: ConnectionProvider[]
    onAuthChange: (callback: (user: HappyUser | undefined, provider: EIP1193Provider) => void) => void
} {
    const { signIn, signOut, onAuthChange } = useFirebaseAuth()

    const providers = useMemo(
        () => [
            {
                type: "social",
                id: "social:firebase",
                name: "Google",
                icon: googleLogo,
                enable: () => signIn("google"),
                disable: () => signOut(),
            },
        ],
        [signIn, signOut],
    )

    return {
        providers: providers,
        onAuthChange,
    }
}
