import type { ChainParameters } from "../utils"

export const devnetDefinition = {
    chainName: "localhost",
    rpcUrls: ["http://127.0.0.1:8545", "ws://127.0.0.1:8545"],
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    chainId: "0x539", // 1337
} satisfies ChainParameters
