import { useHappyChain } from "@happychain/react"
import { useMemo } from "react"
import { type PublicClient, type WalletClient, createPublicClient, createWalletClient, custom } from "viem"

/**
 * Creates custom public + wallet clients using the HappyProvider.
 */
export default function useClients(): {
    publicClient: PublicClient
    walletClient: WalletClient | null
} {
    const { provider, user } = useHappyChain()

    const publicClient = useMemo(() => createPublicClient({ transport: custom(provider!) }), [provider])

    const walletClient = useMemo(
        () =>
            user?.address && provider
                ? createWalletClient({
                      account: user.address,
                      transport: custom(provider),
                  })
                : null,
        [user, provider],
    )

    return {
        publicClient,
        walletClient,
    }
}
