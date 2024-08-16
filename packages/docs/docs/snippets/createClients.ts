// Don't include this in the snippet!
import { happyProvider } from '@happychain/js'

// [!region viem]
import { createPublicClient, createWalletClient, custom } from 'viem'

const transport = custom(happyProvider) // [!code focus]
const publicClient = createPublicClient({ transport }) // [!code focus]
const walletClient = createWalletClient({ transport }) // [!code focus]
// [!endregion viem]

// [!region ethers]
import { BrowserProvider } from 'ethers'

const ethersProvider = new BrowserProvider(happyProvider) // [!code focus]
// [!endregion ethers]

// [!region web3]
import Web3 from 'web3'

const web3 = new Web3(happyProvider) // [!code focus]
// [!endregion web3]
