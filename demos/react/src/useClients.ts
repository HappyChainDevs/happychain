import { useHappyChain } from "@happy.tech/react"
import { useMemo } from "react"
import {
    type Account,
    type CustomTransport,
    type PublicClient,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    custom,
} from "viem"

/**
 * Creates custom public + wallet clients using the HappyProvider.
 */
export default function useClients(): {
    publicClient: PublicClient
    walletClient: WalletClient<CustomTransport, undefined, Account> | null
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
