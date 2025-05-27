import { createPublicClient, webSocket, http } from 'viem'
import { happychainTestnet } from 'viem/chains'

// Create a public client for the happychainTestnet
const publicClient = createPublicClient({
  chain: happychainTestnet,
  transport: http(),
})

// Subscribe to new blocks
const unsubscribe = publicClient.watchBlocks({
  onBlock: (block) => {
    console.log('New block received:', block)
  },
  includeTransactions: false,
  onError: (error) => {
    console.error('Error watching blocks:', error)
  },
})
