import type { EIP1193Parameters } from 'viem'

const safeList = new Set([
    'eth_accounts',
    'eth_blockNumber',
    'eth_call',
    'eth_chainId',
    'eth_getBalance',
    'eth_getBlockByNumber',
    'eth_getLogs',
    'eth_getTransactionByHash',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
])

export function requiresApproval(req: EIP1193Parameters) {
    return !safeList.has(req.method)
}
