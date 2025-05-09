import type { ChainParameters } from "../utils"

export const happyChainSepoliaDefinition = {
    chainName: "HappyChain Sepolia",
    rpcUrls: ["https://rpc.testnet.happy.tech/http", "wss://rpc.testnet.happy.tech/ws"],
    nativeCurrency: { name: "HappyChain", symbol: "HAPPY", decimals: 18 },
    chainId: "0xd8", // 216 — must be lowercased to enable comparison with chainId from Viem's `happychainTestnet` import
    blockExplorerUrls: ["https://explorer.testnet.happy.tech"],
    opStack: true,
} as const satisfies ChainParameters
