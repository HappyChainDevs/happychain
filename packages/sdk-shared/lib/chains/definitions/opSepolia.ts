import type { AddEthereumChainParameter } from 'viem'

export const opSepolia: AddEthereumChainParameter = {
    chainName: 'OP Sepolia',
    rpcUrls: ['https://sepolia.optimism.io', 'https://optimism-sepolia.drpc.org', 'wss://optimism-sepolia.drpc.org'],
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    chainId: '0xaa37dc',
    blockExplorerUrls: ['https://optimism-sepolia.blockscout.com'],
}
