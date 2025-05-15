import type { ChainParameters } from "../utils"

export const anvilDefinition = {
    chainName: "Anvil",
    rpcUrls:
        // override RPC url when set in the env & app is running in dev mode
        import.meta.env.DEV && import.meta.env.VITE_DEV_RPC_URL
            ? [import.meta.env.VITE_DEV_RPC_URL]
            : ["http://127.0.0.1:8545", "ws://127.0.0.1:8545"],
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    chainId: "0x7a69", // 31337 — must be lowercased to enable comparison with chainId from Viem's `anvil` import
} as const satisfies ChainParameters
