import type { GetTransactionReceiptReturnType, Hex, WalletGetCallsStatusReturnType } from "viem"

export function convertUserOpReceiptToCallStatus(
    receipts: GetTransactionReceiptReturnType[] | null,
): WalletGetCallsStatusReturnType {
    if (!receipts || receipts.length === 0) {
        return { status: "PENDING" }
    }

    return {
        status: "CONFIRMED",
        receipts: receipts.map((receipt) => ({
            logs: receipt.logs.map((log) => ({
                address: log.address as Hex,
                data: log.data as Hex,
                topics: log.topics as Hex[],
            })),
            status: (receipt.status === "success" ? "0x1" : "0x0") as Hex,
            blockHash: receipt.blockHash as Hex,
            blockNumber: `0x${receipt.blockNumber.toString(16)}` as Hex,
            gasUsed: `0x${receipt.gasUsed.toString(16)}` as Hex,
            transactionHash: receipt.transactionHash as Hex,
        })),
    }
}
