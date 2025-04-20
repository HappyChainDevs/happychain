import {
    type HappyPublicClient,
    type HappyWalletClient,
    createHappyPublicClient,
    createHappyWalletClient,
} from "@happy.tech/core"
import { useMemo } from "react"

/**
 * Creates custom public + wallet clients using the HappyProvider.
 */
export default function useClients(): {
    publicClient: HappyPublicClient
    walletClient: HappyWalletClient
} {
    const publicClient = useMemo(() => createHappyPublicClient(), [])
    const walletClient = useMemo(() => createHappyWalletClient(), [])

    return {
        publicClient,
        walletClient,
    }
}
