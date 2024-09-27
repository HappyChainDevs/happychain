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

    async flush() {
        this.notFinalizedTransactions = this.notFinalizedTransactions.filter((transaction) =>
            NotFinalizedStatuses.includes(transaction.status),
        )

        await this.transactionManager.entityManager.flush()
    }
}
