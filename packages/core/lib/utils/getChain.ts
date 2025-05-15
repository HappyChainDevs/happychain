import type { Chain, ChainRpcUrls } from "@happy.tech/wallet-common"
import { anvil, happyChainSepolia } from "@happy.tech/wallet-common"

/**
 * Returns a {@link Chain} object based on the provided chain ID.
 *
 * If the chain has built-in support (HappyChain Sepolia (216), Local Devnet (31337), then
 * it is not necessary to provide RPC urls. Otherwise providing the rpc URL(s) is mandatory.

 * @throws Error if an rpc URL is not provided for a custom chain
 */
export function getChain(chainId: number, rpc?: ChainRpcUrls): Chain {
    switch (chainId) {
        case happyChainSepolia.id:
            return happyChainSepolia
        case anvil.id:
            return anvil
        default:
            if (!rpc) throw new Error("Must provide rpc URLs for non-builtin chain")
            return {
                id: chainId,
                name: `Chain with id ${chainId}`,
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: {
                    default: rpc,
                },
            }
    }
}
