import type { AddEthereumChainParameter } from "viem"

export const ethereum: AddEthereumChainParameter = {
    chainName: "Ethereum",
    rpcUrls: [
        "https://mainnet.infura.io/v3/${INFURA_API_KEY}",
        "wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}",
        "https://api.mycryptoapi.com/eth",
        "https://cloudflare-eth.com",
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
}
