import { NotFinalizedStatuses, Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

export class TransactionRepository {
    private readonly transactionManager: TransactionManager
    private notFinalizedTransactions: Transaction[]

    constructor(transactionManager: TransactionManager) {
        this.transactionManager = transactionManager
        this.notFinalizedTransactions = []
    }

    async start() {
        this.notFinalizedTransactions = await this.transactionManager.entityManager.find(Transaction, {
            status: NotFinalizedStatuses,
        })
    }

    getNotFinalizedTransactions(): Transaction[] {
        return [...this.notFinalizedTransactions]
    }

    saveTransactions(transactions: Transaction[]) {
        for (const transaction of transactions) {
            if (NotFinalizedStatuses.includes(transaction.status)) {
                this.notFinalizedTransactions.push(transaction)
            }
            this.transactionManager.entityManager.persist(transaction)
        }
    }

    removeTransactions(transactions: Transaction[]) {
        for (const transaction of transactions) {
            this.notFinalizedTransactions.splice(this.notFinalizedTransactions.indexOf(transaction), 1)
            this.transactionManager.entityManager.remove(transaction)
        }
    }

    getHighestNonce(): number | undefined {
        return this.notFinalizedTransactions.length > 0
            ? Math.max(...this.notFinalizedTransactions.flatMap((t) => t.attempts.map((a) => a.nonce)))
            : undefined
    }

    getNotReservedNoncesInRange(from: number, to: number): number[] {
        return Array.from({ length: to - from + 1 }, (_, i) => from + i).filter(
            (n) => !this.notFinalizedTransactions.some((t) => t.attempts.some((a) => a.nonce === n)),
        )
    }

    async flush() {
        this.notFinalizedTransactions = this.notFinalizedTransactions.filter((transaction) =>
            NotFinalizedStatuses.includes(transaction.status),
        )

        await this.transactionManager.entityManager.flush()
    }
}
