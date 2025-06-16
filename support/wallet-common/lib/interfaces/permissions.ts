import { HappyMethodNames } from "@happy.tech/wallet-common"
import type { EIP1193Parameters } from "viem"

// https://eips.ethereum.org/EIPS/eip-1474

// Disabled - These are 'disabled' methods. they are added here so that the user is not presented
// with a confirmation screen, and 'permissionless' requests will directly throw an error if they
// are called. To enable the popup for these methods, remove them here (they should already be present
// in the unsafeList)
const disabledInProdList = import.meta.env.PROD
    ? [
          "wallet_addEthereumChain", // https://eips.ethereum.org/EIPS/eip-3085
          "wallet_switchEthereumChain", // https://eips.ethereum.org/EIPS/eip-3326
          "wallet_updateEthereumChain", // https://eips.ethereum.org/EIPS/eip-2015
      ]
    : []

/**
 * This is the list of methods that will never require a user confirmation.
 * Most such as eth_chainId are fully public RPC calls.
 * Some such as eth_accounts will return different results based on the users permissions.
 * Some such as wallet_revokePermissions don't make sense if a user isn't connected, but are still safe to call.
 */
const safeList = new Set([
    ...disabledInProdList,

    // happychain methods
    HappyMethodNames.USER, // => returns the current connected user if permissions are granted and user is connected

    // standard methods
    "eth_accounts",
    "eth_blobBaseFee",
    "eth_blockNumber",
    "eth_call",
    "eth_chainId",
    "eth_coinbase",
    "eth_estimateGas",
    "eth_feeHistory",
    "eth_gasPrice",
    "eth_getBalance",
    "eth_getBlockByHash",
    "eth_getBlockByNumber",
    "eth_getBlockReceipts",
    "eth_getBlockTransactionCountByHash",
    "eth_getBlockTransactionCountByNumber",
    "eth_getCode",
    "eth_getFilterChanges",
    "eth_getFilterLogs",
    "eth_getLogs",
    "eth_getProof",
    "eth_getStorageAt",
    "eth_getTransactionByBlockHashAndIndex",
    "eth_getTransactionByBlockNumberAndIndex",
    "eth_getTransactionByHash",
    "eth_getTransactionCount",
    "eth_getTransactionReceipt",
    "eth_getUncleByBlockHashAndIndex",
    "eth_getUncleByBlockNumberAndIndex",
    "eth_getUncleCountByBlockHash",
    "eth_getUncleCountByBlockNumber",
    "eth_getWork",
    "eth_hashrate",
    "eth_maxPriorityFeePerGas",
    "eth_mining",
    "eth_newBlockFilter",
    "eth_newFilter",
    "eth_newPendingTransactionFilter",
    "eth_protocolVersion",
    "eth_sendRawTransaction",
    "eth_submitHashrate",
    "eth_submitWork",
    "eth_subscribe",
    "eth_syncing",
    "eth_uninstallFilter",
    "eth_unsubscribe",
    "net_listening",
    "net_peerCount",
    "net_version",
    "wallet_getPermissions", // https://eips.ethereum.org/EIPS/eip-2255
    "wallet_revokePermissions", // https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md
    "web3_clientVersion",
    "web3_sha3",
])

/**
 * This is a list of methods that require user interactions.
 * Unlike the unsafeList below, these do not manage permissions or transactions,
 * but instead will have options related to wallet functionality.
 */
const interactiveList = new Set([
    "wallet_watchAsset", // https://eips.ethereum.org/EIPS/eip-747 // probably safe
    "wallet_scanQRCode", // https://github.com/ethereum/EIPs/issues/945
    "wallet_registerOnboarding", // metamask onboarding, maybe we can do something with this too?
])

/**
 * This is the list of protected methods.
 * Each of these will require a Confirmation Screen.
 * In most cases, this screen will be displayed every time the request occurs,
 * such as `eth_sendTransaction`, or `personal_sign`, however for
 * methods such as `wallet_requestPermissions`, the confirmation is only shown if the user
 * has not previously granted the requested permissions (or has revoked them).
 * Subsequent requests would not need the confirmation screen displayed.
 */
const unsafeList = new Set([
    // happychain methods
    HappyMethodNames.LOAD_ABI, // eip-xxxx :)
    HappyMethodNames.REQUEST_SESSION_KEY,

    // permissions
    "eth_requestAccounts", // https://eips.ethereum.org/EIPS/eip-1102
    "wallet_requestPermissions", // https://eips.ethereum.org/EIPS/eip-2255

    // wallet settings
    "wallet_addEthereumChain", // https://eips.ethereum.org/EIPS/eip-3085
    "wallet_switchEthereumChain", // https://eips.ethereum.org/EIPS/eip-3326
    "wallet_updateEthereumChain", // https://eips.ethereum.org/EIPS/eip-2015

    // signing methods
    "eth_signTransaction",
    "personal_sign", // https://eips.ethereum.org/EIPS/eip-191
    "eth_sign",
    "eth_signTypedData",
    "eth_signTypedData_v1",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
    // send transactions
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "wallet_sendTransaction",
    // cryptography
    "eth_decrypt",
    "eth_getEncryptionPublicKey",
])

/**
 * Stores the categorized RPC calls.
 */
export const permissionsLists = new Map([
    ["unsafe", unsafeList], // requires approvals
    ["interactive", interactiveList], //
    ["safe", safeList], // does not require approvals
])

/**
 *
 * Returns if the request needs a user confirmation. This does not take into account
 * current site of the app (user connected, applied permissions, etc) but only does
 * an initial check if the method is in the safe list, or not.
 *
 * @param req eip1193 request { method: string, params?: unknown[] }
 * @returns if the request is protected
 */
export function requiresApproval(req: EIP1193Parameters) {
    return !safeList.has(req.method)
}
