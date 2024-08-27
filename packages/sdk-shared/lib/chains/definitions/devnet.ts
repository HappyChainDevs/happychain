import type { AddEthereumChainParameter } from "viem"

export const devnet = {
    chainName: "localhost",
    rpcUrls: ["http://127.0.0.1:8545", "ws://127.0.0.1:8545"],
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    chainId: "0x7a69", // 31337
} as const satisfies Readonly<AddEthereumChainParameter>
