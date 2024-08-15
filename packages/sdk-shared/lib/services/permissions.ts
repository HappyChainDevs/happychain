import type { EIP1193Parameters } from 'viem'

// https://eips.ethereum.org/EIPS/eip-1474

// can proceed silently, no confirmation required
const safeList = new Set([
    'eth_accounts',
    'eth_blobBaseFee',
    'eth_blockNumber',
    'eth_call',
    'eth_chainId',
    'eth_coinbase',
    'eth_estimateGas',
    'eth_feeHistory',
    'eth_gasPrice',
    'eth_getBalance',
    'eth_getBlockByHash',
    'eth_getBlockByNumber',
    'eth_getBlockReceipts',
    'eth_getBlockTransactionCountByHash',
    'eth_getBlockTransactionCountByNumber',
    'eth_getCode',
    'eth_getFilterChanges',
    'eth_getFilterLogs',
    'eth_getLogs',
    'eth_getProof',
    'eth_getStorageAt',
    'eth_getTransactionByBlockHashAndIndex',
    'eth_getTransactionByBlockNumberAndIndex',
    'eth_getTransactionByHash',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
    'eth_getUncleByBlockHashAndIndex',
    'eth_getUncleByBlockNumberAndIndex',
    'eth_getUncleCountByBlockHash',
    'eth_getUncleCountByBlockNumber',
    'eth_getWork',
    'eth_hashrate',
    'eth_maxPriorityFeePerGas',
    'eth_mining',
    'eth_newBlockFilter',
    'eth_newFilter',
    'eth_newPendingTransactionFilter',
    'eth_protocolVersion',
    'eth_sendRawTransaction',
    'eth_submitHashrate',
    'eth_submitWork',
    'eth_subscribe',
    'eth_syncing',
    'eth_uninstallFilter',
    'eth_unsubscribe',
    'net_listening',
    'net_peerCount',
    'net_version',
    'wallet_getPermissions', // https://eips.ethereum.org/EIPS/eip-2255
    'wallet_revokePermissions', // essentially disconnect... rabby does not implement this
    'web3_clientVersion', // TODO: customize!
    'web3_sha3',
])

// require user interaction (not specifically confirmations/approvals)
const interactiveList = new Set([
    'wallet_watchAsset', // https://eips.ethereum.org/EIPS/eip-747 // probably safe
    'wallet_scanQRCode', // https://github.com/ethereum/EIPs/issues/945
    'wallet_registerOnboarding', // metamask onboarding, maybe we can do something with this too?
])

// require confirmation prompt screens
const unsafeList = new Set([
    'eth_requestAccounts', // implement per-domain access list here?
    'eth_signTransaction',
    'wallet_requestPermissions', // https://eips.ethereum.org/EIPS/eip-2255

    'personal_sign', // https://eips.ethereum.org/EIPS/eip-191
    'wallet_addEthereumChain', // https://eips.ethereum.org/EIPS/eip-3085
    'wallet_switchEthereumChain', // https://eips.ethereum.org/EIPS/eip-3326 - https://ethereum-magicians.org/t/eip-3326-wallet-switchethereumchain/5471

    // metamask signing methods
    'eth_sendRawTransaction',
    'eth_sendTransaction',
    'eth_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'eth_decrypt',
    'eth_getEncryptionPublicKey',
])

export const permissionsLists = new Map([
    ['unsafe', unsafeList], // requires approvals
    ['interactive', interactiveList], //
    ['safe', safeList], // does not require approvals
])

export function requiresApproval(req: EIP1193Parameters) {
    return !safeList.has(req.method)
}
