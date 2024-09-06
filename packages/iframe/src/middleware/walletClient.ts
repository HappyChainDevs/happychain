import type { EIP1193RequestParameters, ProviderEventPayload } from "@happychain/sdk-shared"
import { useCallback } from "react"
import type { Client } from "viem"
import { useClientMiddlewareExecutor } from "./utils"
import { useEthRequestAccountsMiddleware } from "./walletClient/eth_requestAccounts"
import { useWalletAddEthereumChainMiddleware } from "./walletClient/wallet_addEthereumChain"
import { useWalletRequestPermissionsMiddleware } from "./walletClient/wallet_requestPermissions"
import { useWalletSwitchEthereumChainMiddleware } from "./walletClient/wallet_switchEthereumChain"

export function useWalletClientMiddleware() {
    // wallet client middlewares
    const ethRequestAccountsMiddleware = useEthRequestAccountsMiddleware()
    const walletAddEthereumChainMiddleware = useWalletAddEthereumChainMiddleware()
    const walletRequestPermissionMiddleware = useWalletRequestPermissionsMiddleware()
    const walletSwitchEthereumChainMiddleware = useWalletSwitchEthereumChainMiddleware()

    const execute = useCallback(
        async (client: Client | undefined, data: ProviderEventPayload<EIP1193RequestParameters>) => {
            if (!client) {
                throw new Error("Wallet client not found")
            }

            return await client.request(data.payload)
        },
        [],
    )

    const runMiddleware = useClientMiddlewareExecutor(execute, [
        // accounts & permissions
        ethRequestAccountsMiddleware,
        walletRequestPermissionMiddleware,
        // chain management
        walletAddEthereumChainMiddleware,
        walletSwitchEthereumChainMiddleware,
    ])

    return runMiddleware
}
