import type { ChainParameters } from "../utils"

export const op = {
    chainName: "OP Mainnet",
    rpcUrls: [
        "https://mainnet.optimism.io",
        "https://optimism-rpc.publicnode.com",
        "wss://optimism-rpc.publicnode.com",
        "https://optimism.gateway.tenderly.co",
        "wss://optimism.gateway.tenderly.co",
        "https://optimism.drpc.org",
        "wss://optimism.drpc.org",
    ],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    chainId: "0xa",
    blockExplorerUrls: [
        "https://optimistic.etherscan.io",
        "https://optimism.blockscout.com",
        "https://optimism.dex.guru",
    ],
    opStack: true,
} satisfies ChainParameters
