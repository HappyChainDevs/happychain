import { chainDefinitions } from "@happy.tech/wallet-common"
import type { ChainParameters } from "@happy.tech/wallet-common"
import { worker } from "@happy.tech/worker/runtime"
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider"
import { makeEthereumSigner } from "@web3auth/mpc-core-kit"
import { web3Auth } from "../web3auth/mpc-core-kit"

const chainId = Number(import.meta.env.HAPPY_CHAIN_ID)
const chain = Object.values(chainDefinitions).find((a) => Number(a.chainId) === chainId) as ChainParameters

export const ethereumSigningProvider = new EthereumSigningProvider({
    config: {
        skipLookupNetwork: true,
        chainConfig: {
            chainNamespace: "eip155" as const,
            chainId: chain.chainId,
            rpcTarget: chain.rpcUrls.find((url) => url.startsWith("http")) as string,
            displayName: chain.chainName,
            blockExplorerUrl: chain.blockExplorerUrls?.[0],
            ticker: chain.nativeCurrency?.symbol,
            tickerName: chain.nativeCurrency?.name,
            decimals: chain.nativeCurrency?.decimals,
            wsTarget: chain.rpcUrls.find((url) => url.startsWith("ws")),
        },
    },
})

// Initialize Provider
ethereumSigningProvider.setupProvider(makeEthereumSigner(web3Auth))

/**
 * Proxy all provider events to iframe provider
 */
ethereumSigningProvider.on("connect", async (data) => {
    worker.broadcast({ action: "connect", data })
})
ethereumSigningProvider.on("disconnect", () => {
    worker.broadcast({ action: "disconnect", data: undefined })
})
ethereumSigningProvider.on("chainChanged", async (data) => {
    worker.broadcast({ action: "chainChanged", data })
})
ethereumSigningProvider.on("accountsChanged", (data) => {
    worker.broadcast({ action: "accountsChanged", data })
})
