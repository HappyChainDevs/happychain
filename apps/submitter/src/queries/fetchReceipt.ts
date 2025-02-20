import type { HappyTxState } from "#src/tmp/interface/HappyTxState"
import type { ReceiptInput } from "#src/tmp/interface/submitter_receipt"
import { fetchState } from "./fetchState"

export async function fetchReceipt({ hash, timeout: _timeout }: ReceiptInput): Promise<HappyTxState | undefined> {
    // TODO:
    return await fetchState(hash)
}
