import { useCallback, useEffect, useRef, useState } from 'react'

import { useHappyChain } from '@happychain/react'
import { createPublicClient, createWalletClient, custom } from 'viem'

export function useViemClient() {
    const { provider, user } = useHappyChain()

    // create public client
    const publicClient = useRef(createPublicClient({ transport: custom(provider) }))

    // create wallet client factory
    const createEvmWallet = useCallback(
        (account: `0x${string}`) =>
            createWalletClient({
                account,
                transport: custom(provider),
            }),
        [provider],
    )

    // store current wallet client if available
    const [walletClient, setWalletClient] = useState<ReturnType<typeof createEvmWallet>>()

    // keep active wallet client in sync
    useEffect(() => {
        console.log('setting wallet')
        const client = user?.address ? createEvmWallet(user.address) : undefined
        setWalletClient(client)
    }, [createEvmWallet, user?.address])

    return { walletClient, publicClient: publicClient.current }
}
