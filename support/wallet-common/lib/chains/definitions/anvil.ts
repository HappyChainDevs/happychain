import type { ChainParameters } from "../utils"

export const anvilDefinition = {
    chainName: "Anvil",
    // If used, HAPPY_RPC_OVERRIDE must be set in the iframe or core package .env file.
    rpcUrls: import.meta.env.HAPPY_RPC_OVERRIDE
        ? [import.meta.env.HAPPY_RPC_OVERRIDE]
        : ["https://rpc.testnet.happy.tech/http", "wss://rpc.testnet.happy.tech/ws"],
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    chainId: "0x7a69", // 31337 — must be lowercased to enable comparison with chainId from Viem's `anvil` import
} as const satisfies ChainParameters
