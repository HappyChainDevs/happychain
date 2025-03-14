import type { Hex, Log, WalletGetCallsStatusReturnType } from "viem"
import type { UserOperationReceipt } from "viem/account-abstraction"

/**
 * Converts an array of user operation receipts into the {@link WalletGetCallsStatusReturnType} format.
 * If no receipts are provided, returns a `"PENDING"` status.
 *
 * @param receipts - Array of UserOperationReceipt objects or null.
 * @returns WalletGetCallsStatusReturnType with formatted receipt data.
 */
export function convertUserOpReceiptToCallStatus(
    receipts: UserOperationReceipt[] | null,
): WalletGetCallsStatusReturnType {
    if (!receipts || receipts.length === 0) {
        return { status: "PENDING" }
    }

    return {
        status: "CONFIRMED",
        receipts: receipts.map(({ receipt, logs, success }) => ({
            logs: logs.map((log: Log<bigint, number, false>) => ({
                address: log.address as Hex,
                data: log.data as Hex,
                topics: log.topics as Hex[],
            })),
            status: (success ? "0x1" : "0x0") as Hex,
            blockHash: receipt.blockHash as Hex,
            blockNumber: `0x${receipt.blockNumber.toString(16)}` as Hex,
            gasUsed: `0x${receipt.gasUsed.toString(16)}` as Hex,
            transactionHash: receipt.transactionHash as Hex,
        })),
    } satisfies WalletGetCallsStatusReturnType
}
