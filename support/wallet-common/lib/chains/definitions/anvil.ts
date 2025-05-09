import type { ChainParameters } from "../utils"

export const anvilDefinition = {
    chainName: "Anvil",
    rpcUrls: ["http://127.0.0.1:8545", "ws://127.0.0.1:8545"],
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    chainId: "0x7a69", // 31337 — must be lowercased to enable comparison with chainId from Viem's `anvil` import
} satisfies ChainParameters
