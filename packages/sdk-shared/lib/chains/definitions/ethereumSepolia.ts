import type { AddEthereumChainParameter } from 'viem'

export const ethereumSepolia: AddEthereumChainParameter = {
    chainName: 'Sepolia',
    rpcUrls: [
        'https://rpc.sepolia.org',
        'https://rpc2.sepolia.org',
        'https://rpc-sepolia.rockx.com',
        'https://rpc.sepolia.ethpandaops.io',
        'https://sepolia.infura.io/v3/${INFURA_API_KEY}',
        'wss://sepolia.infura.io/v3/${INFURA_API_KEY}',
        'https://sepolia.gateway.tenderly.co',
        'wss://sepolia.gateway.tenderly.co',
        'https://ethereum-sepolia-rpc.publicnode.com',
        'wss://ethereum-sepolia-rpc.publicnode.com',
        'https://sepolia.drpc.org',
        'wss://sepolia.drpc.org',
        'https://rpc-sepolia.rockx.com',
    ],
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    chainId: '0xaa36a7',
    blockExplorerUrls: ['https://sepolia.etherscan.io', 'https://sepolia.otterscan.io'],
}
