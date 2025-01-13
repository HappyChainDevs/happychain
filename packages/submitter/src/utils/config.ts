import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { localhost } from 'viem/chains'

if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required')
}

if (!process.env.RPC_URL) {
    throw new Error('RPC_URL environment variable is required')
}

const privateKey = process.env.PRIVATE_KEY as `0x${string}`
const rpcURL = process.env.RPC_URL

export const account = privateKeyToAccount(privateKey)

export const walletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http(rpcURL)
})

export const publicClient = createPublicClient({
    chain: localhost,
    transport: http(rpcURL)
})
