import type { AddEthereumChainParameter } from "viem"

export const ethereum = {
    chainName: "Ethereum",
    rpcUrls: [
        "https://cloudflare-eth.com",
        "https://api.mycryptoapi.com/eth",
        "https://ethereum-rpc.publicnode.com",
        "wss://ethereum-rpc.publicnode.com",
        "https://mainnet.gateway.tenderly.co",
        "wss://mainnet.gateway.tenderly.co",
        "https://rpc.blocknative.com/boost",
        "https://rpc.flashbots.net",
        "https://rpc.flashbots.net/fast",
        "https://rpc.mevblocker.io",
        "https://rpc.mevblocker.io/fast",
        "https://rpc.mevblocker.io/noreverts",
        "https://rpc.mevblocker.io/fullprivacy",
        "https://eth.drpc.org",
        "wss://eth.drpc.org",
    ],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    chainId: "0x1",
    blockExplorerUrls: ["https://etherscan.io", "https://eth.blockscout.com", "https://ethereum.dex.guru"],
} as const satisfies Readonly<AddEthereumChainParameter>
