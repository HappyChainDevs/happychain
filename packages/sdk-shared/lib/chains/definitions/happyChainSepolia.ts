import type { AddEthereumChainParameter } from "viem"

export const happyChainSepolia = {
    chainName: "HappyChain Sepolia",
    rpcUrls: ["https://happy-testnet-sepolia.rpc.caldera.xyz/http", "wss://happy-testnet-sepolia.rpc.caldera.xyz/ws"],
    nativeCurrency: { name: "HappyChain", symbol: "HAPPY", decimals: 18 },
    chainId: "0xd8",
    blockExplorerUrls: ["https://happy-testnet-sepolia.explorer.caldera.xyz"],
} as const satisfies Readonly<AddEthereumChainParameter>
