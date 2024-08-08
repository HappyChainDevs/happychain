import { googleLogo } from "@happychain/common"
import type { ConnectionProvider, HappyUser } from "@happychain/sdk-shared"
import { useMemo } from "react"
import type { EIP1193Provider } from "viem"
import { firebaseAuth } from "../services/firebase"
import { useFirebaseAuth } from "./useFirebaseAuth"

export function useFirebaseWeb3AuthStrategy(): {
    providers: ConnectionProvider[]
    onAuthChange: (callback: (user: HappyUser | undefined, provider: EIP1193Provider) => void) => void
} {
    const { signIn, signOut, onAuthChange } = useFirebaseAuth(firebaseAuth)

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
        providers,
        onAuthChange,
    }
}
