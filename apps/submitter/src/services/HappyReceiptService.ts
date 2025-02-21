import type { HappyReceiptRepository } from "#src/repositories/HappyReceiptRepository"
import type { HappyTxReceipt } from "#src/tmp/interface/HappyTxReceipt"

export class HappyReceiptService {
    constructor(private happyReceiptRepository: HappyReceiptRepository) {}

    async insert(newData: HappyTxReceipt) {
        const { txReceipt, ...newData2 } = newData
        const data = await this.happyReceiptRepository.insert({
            ...newData2,
            transactionHash: txReceipt.transactionHash,
        })
        return data
    }

    async insertOrThrow(newData: HappyTxReceipt) {
        const data = await this.insert(newData)
        if (!data) throw new Error("Failed to find receipt")
        return data
    }
}
