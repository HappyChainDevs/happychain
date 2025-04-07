import { unknownToError } from "@happy.tech/common"
import type { UUID } from "@happy.tech/common"
import { ValueType, metrics } from "@opentelemetry/api"
import { type Result, ResultAsync } from "neverthrow"
import { Topics, eventBus } from "./EventBus.js"
import { NotFinalizedStatuses, Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { db } from "./db/driver.js"

const meter = metrics.getMeter("txm.transaction-repository")

const notFinalizedTransactionsGauge = meter.createGauge("txm.transaction-repository.not-finalized-transactions", {
    description: "Quantity of transactions in the repository that are not finalized",
    unit: "count",
    valueType: ValueType.INT,
})

/**
 * This module acts as intermediate layer between the library and the database.
 * Its maintains an in-memory copy of all the not finalized transactions to avoid access to database and thus
 * improving the latency of _get_ transactions. In addition, it contains other helpful methods like `getHighestNonce`
 * that returns the biggest nonce of all the not finalized transactions that exist in the database or the flush function
 * that is used to commit all the changes that have occurred in tracked entities by the ORM in the database.
 */
export class TransactionRepository {
    private readonly transactionManager: TransactionManager
    private notFinalizedTransactions: Transaction[]

    constructor(transactionManager: TransactionManager) {
        this.transactionManager = transactionManager
        this.notFinalizedTransactions = []
    }

    async start() {
        const transactionRows = await db
            .selectFrom("transaction")
            .where("status", "in", NotFinalizedStatuses)
            .where("from", "=", this.transactionManager.viemWallet.account.address)
            .selectAll()
            .execute()

        this.notFinalizedTransactions = transactionRows.map((row) => Transaction.fromDbRow(row))

        if (this.transactionManager.finalizedTransactionPurgeTime > 0) {
            eventBus.on(Topics.NewBlock, this.purgeFinalizedTransactions.bind(this))
        }
    }

    getNotFinalizedTransactionsOlderThan(blockNumber: bigint): Transaction[] {
        return this.notFinalizedTransactions.filter((t) => t.collectionBlock && t.collectionBlock < blockNumber)
    }

    async getTransaction(intentId: UUID): Promise<Transaction | undefined> {
        const cachedTransaction = this.notFinalizedTransactions.find((t) => t.intentId === intentId)

        if (cachedTransaction) {
            return cachedTransaction
        }

        const persistedTransaction = await db
            .selectFrom("transaction")
            .where("intentId", "=", intentId)
            .where("from", "=", this.transactionManager.viemWallet.account.address)
            .selectAll()
            .executeTakeFirst()

        return persistedTransaction ? Transaction.fromDbRow(persistedTransaction) : undefined
    }

    async saveTransactions(transactions: Transaction[]): Promise<Result<void, Error>> {
        const transactionsToFlush = transactions.filter((t) => t.pendingFlush)

        const notPersistedTransactions = transactions.filter((t) => t.notPersisted)

        const result = await ResultAsync.fromPromise(
            db.transaction().execute(async (dbTransaction) => {
                const promises = transactionsToFlush.map((t) => {
                    if (t.notPersisted) {
                        dbTransaction.insertInto("transaction").values(t.toDbRow()).execute()
                    } else {
                        dbTransaction
                            .updateTable("transaction")
                            .set(t.toDbRow())
                            .where("intentId", "=", t.intentId)
                            .execute()
                    }
                })
                await Promise.all(promises)
            }),
            unknownToError,
        )

        if (result.isOk()) {
            this.notFinalizedTransactions = this.notFinalizedTransactions.filter((transaction) =>
                NotFinalizedStatuses.includes(transaction.status),
            )
            this.notFinalizedTransactions.push(...notPersistedTransactions)
            transactions.forEach((t) => t.markFlushed())

            notFinalizedTransactionsGauge.record(this.notFinalizedTransactions.length)
        }

        return result
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

    async purgeFinalizedTransactions() {
        await db
            .deleteFrom("transaction")
            .where("status", "not in", NotFinalizedStatuses)
            .where("updatedAt", "<", Date.now() - this.transactionManager.finalizedTransactionPurgeTime)
            .where("from", "=", this.transactionManager.viemWallet.account.address)
            .execute()
    }
}
