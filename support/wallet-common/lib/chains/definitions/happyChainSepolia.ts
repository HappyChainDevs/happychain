import type { ChainParameters } from "../utils.ts"

export const happyChainSepolia = {
    chainName: "HappyChain Sepolia",
    rpcUrls: ["https://rpc.testnet.happy.tech/http", "wss://rpc.testnet.happy.tech/ws"],
    nativeCurrency: { name: "HappyChain", symbol: "HAPPY", decimals: 18 },
    chainId: "0xd8",
    blockExplorerUrls: ["https://explorer.testnet.happy.tech"],
    opStack: true,
} satisfies ChainParameters
