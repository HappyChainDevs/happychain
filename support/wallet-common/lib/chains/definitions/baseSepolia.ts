import type { ChainParameters } from "../utils"

export const baseSepolia = {
    chainName: "Base Sepolia",
    rpcUrls: [
        "https://sepolia.base.org",
        "https://base-sepolia-rpc.publicnode.com",
        "wss://base-sepolia-rpc.publicnode.com",
    ],
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    chainId: "0x14a34",
    blockExplorerUrls: ["https://base-sepolia.blockscout.com"],
    opStack: true,
} satisfies ChainParameters
