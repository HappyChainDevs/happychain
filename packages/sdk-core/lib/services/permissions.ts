import type { EIP1193Parameters } from 'viem'

const safeList = new Set(['eth_call', 'eth_getBlockByNumber'])

export function requiresApproval(req: EIP1193Parameters) {
    return !safeList.has(req.method)
}
