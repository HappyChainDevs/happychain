import { TransactionType } from "@happy.tech/common"
import type { RpcTransactionRequest } from "viem"

/**
 * Classify a transaction into its type.
 *
 * The type of requests a wallet can received is not actually super well specified,
 * with Metamask setting the de facto standard for what other wallet should support:
 * https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_sendtransaction/
 *
 * We type our request with the Viem type, but all fields are optional, and many are absent, even when sending
 * from Viem.
 */
export function classifyTxType(tx: RpcTransactionRequest): TransactionType {
    switch (tx.type as string) {
        case TransactionType.Legacy:
            return TransactionType.Legacy
        case TransactionType.AccessList:
            return TransactionType.AccessList
        case TransactionType.EIP1559:
            return TransactionType.EIP1559
        case TransactionType.EIP4844:
            return TransactionType.EIP4844
        case TransactionType.EIP7702:
            return TransactionType.EIP7702
    }
    // The EIP4855 and EIP7702 checks must come first (they have maxFeePerGas too).
    if (tx.blobs || tx.maxFeePerBlobGas) return TransactionType.EIP4844
    if (tx.authorizationList) return TransactionType.EIP7702
    if (tx.gasPrice) return tx.accessList ? TransactionType.AccessList : TransactionType.Legacy
    return TransactionType.EIP1559 // default
}

/**
 * Whether we can handle the given transaction type via `eth_sendTransaction`.
 */
export function isSupported(txType: TransactionType): boolean {
    switch (txType) {
        case TransactionType.Legacy:
        case TransactionType.AccessList:
        case TransactionType.EIP1559:
            return true
        default:
            return false
    }
}
