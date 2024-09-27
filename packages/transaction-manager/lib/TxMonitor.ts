import { bigIntMax } from "@happychain/common"
import type { TransactionReceipt } from "viem"
import type { LatestBlock } from "./BlockMonitor.js"
import { Topics, eventBus } from "./EventBus.js"
import { type Attempt, AttemptType, type Transaction, TransactionStatus } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import type { DebugTransactionSchema } from "./viemTypes.js"

export class TxMonitor {
    private readonly transactionManager: TransactionManager

    constructor(transactionManager: TransactionManager) {
        this.transactionManager = transactionManager
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    private async onNewBlock(block: LatestBlock) {
        const transactions = this.transactionManager.transactionRepository.getNotFinalizedTransactions()

        const promises = transactions.map(async (transaction) => {
            const inAirAttempts = transaction.getInAirAttempts()

            const promises: Promise<{ attempt: Attempt; receipt: TransactionReceipt } | null>[] = inAirAttempts.map(
                async (attempt) => {
                    try {
                        const receipt = await this.transactionManager.viemClient.getTransactionReceipt({
                            hash: attempt.hash,
                        })
                        return { attempt, receipt }
                    } catch (_error) {
                        return null
                    }
                },
            )

            // Select the attempt that was included onchain, or undefined if none was.
            const attemptWithReceipt = (await Promise.all(promises)).filter((result) => result).pop()

            if (!attemptWithReceipt) {
                return await (transaction.isExpired(block, this.transactionManager.blockTime)
                    ? this.handleExpiredTransaction(transaction)
                    : this.handleStuckTransaction(transaction))
            }

            const { attempt, receipt } = attemptWithReceipt

            if (receipt.status === "success") {
                if (attempt.type === AttemptType.Cancellation) {
                    console.error(`Transaction ${transaction.intentId} was cancelled`)
                    return transaction.changeStatus(TransactionStatus.Cancelled)
                }

                return transaction.changeStatus(TransactionStatus.Success)
            }

            if (!this.transactionManager.rpcAllowDebug) {
                if (receipt.gasUsed === attempt.gas) {
                    return await this.handleOutOfGasTransaction(transaction)
                }
                console.error(`Transaction ${transaction.intentId} failed`)
                return transaction.changeStatus(TransactionStatus.Failed)
            }

            const trace = await this.transactionManager.viemClient.request<DebugTransactionSchema>({
                method: "debug_traceTransaction",
                params: [attempt.hash, { tracer: "callTracer" }],
            })
            if (trace.revertReason === "Out of Gas") {
                await this.handleOutOfGasTransaction(transaction)
            } else {
                console.error(`Transaction ${transaction.intentId} failed with reason: ${trace.revertReason}`)
                transaction.changeStatus(TransactionStatus.Failed)
            }
        })

        await Promise.all(promises)
    }

    private calcReplacementFee(
        maxFeePerGas: bigint,
        maxPriorityFeePerGas: bigint,
    ): {
        replacementMaxFeePerGas: bigint
        replacementMaxPriorityFeePerGas: bigint
    } {
        const { maxFeePerGas: marketMaxFeePerGas, maxPriorityFeePerGas: marketMaxPriorityFeePerGas } =
            this.transactionManager.gasPriceOracle.suggestGasForNextBlock()

        const replacementMaxFeePerGas = (maxFeePerGas * 110n) / 100n
        const replacementMaxPriorityFeePerGas = (maxPriorityFeePerGas * 110n) / 100n

        return {
            replacementMaxFeePerGas: bigIntMax(replacementMaxFeePerGas, marketMaxFeePerGas),
            replacementMaxPriorityFeePerGas: bigIntMax(replacementMaxPriorityFeePerGas, marketMaxPriorityFeePerGas),
        }
    }

    private async handleExpiredTransaction(transaction: Transaction): Promise<void> {
        const attempt = transaction.lastAttempt

        if (!attempt) {
            console.error(
                `Transaction ${transaction.intentId} inconsistent state: no attempt found in handleExpiredTransaction`,
            )
            return
        }

        const { replacementMaxFeePerGas, replacementMaxPriorityFeePerGas } = this.calcReplacementFee(
            attempt.maxFeePerGas,
            attempt.maxPriorityFeePerGas,
        )

        transaction.changeStatus(TransactionStatus.Cancelling)

        await this.transactionManager.transactionSubmitter.attemptSubmission(transaction, {
            type: AttemptType.Cancellation,
            nonce: attempt.nonce,
            maxFeePerGas: replacementMaxFeePerGas,
            maxPriorityFeePerGas: replacementMaxPriorityFeePerGas,
        })
    }

    private async handleStuckTransaction(transaction: Transaction): Promise<void> {
        const attempt = transaction.lastAttempt

        if (!attempt) {
            console.error(
                `Transaction ${transaction.intentId} inconsistent state: no attempt found in handleStuckTransaction`,
            )
            return
        }

        const { replacementMaxFeePerGas, replacementMaxPriorityFeePerGas } = this.calcReplacementFee(
            attempt.maxFeePerGas,
            attempt.maxPriorityFeePerGas,
        )

        await this.transactionManager.transactionSubmitter.attemptSubmission(transaction, {
            type: AttemptType.Original,
            nonce: attempt.nonce,
            maxFeePerGas: replacementMaxFeePerGas,
            maxPriorityFeePerGas: replacementMaxPriorityFeePerGas,
        })
    }

    private async handleOutOfGasTransaction(transaction: Transaction): Promise<void> {
        const nonce = this.transactionManager.nonceManager.requestNonce()
        const { maxFeePerGas: marketMaxFeePerGas, maxPriorityFeePerGas: marketMaxPriorityFeePerGas } =
            this.transactionManager.gasPriceOracle.suggestGasForNextBlock()

        await this.transactionManager.transactionSubmitter.attemptSubmission(transaction, {
            type: AttemptType.Original,
            nonce,
            maxFeePerGas: marketMaxFeePerGas,
            maxPriorityFeePerGas: marketMaxPriorityFeePerGas,
        })
    }
}
