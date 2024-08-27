import type { AddEthereumChainParameter } from "viem"

export const base = {
    chainName: "Base",
    rpcUrls: [
        "https://mainnet.base.org/",
        "https://developer-access-mainnet.base.org/",
        "https://base.gateway.tenderly.co",
        "wss://base.gateway.tenderly.co",
        "https://base-rpc.publicnode.com",
        "wss://base-rpc.publicnode.com",
    ],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    chainId: "0x2105",
    blockExplorerUrls: ["https://basescan.org", "https://base.blockscout.com", "https://base.dex.guru"],
} as const satisfies Readonly<AddEthereumChainParameter>
