import { defineChain } from "viem"

export const happyChainTestnetChain = defineChain({
    id: 216,
    name: "HappyChain Testnet",
    nativeCurrency: {
        name: "Happy",
        symbol: "HAPPY",
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ["https://happy-testnet-sepolia.rpc.caldera.xyz/http"],
            webSocket: ["wss://happy-testnet-sepolia.rpc.caldera.xyz/ws"],
        },
    },
    testnet: true,
})
