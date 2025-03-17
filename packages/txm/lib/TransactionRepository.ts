import { unknownToError } from "@happy.tech/common"
import type { UUID } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import { Topics, eventBus } from "./EventBus.js"
import { NotFinalizedStatuses, Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { db } from "./db/driver.js"
import { TxmMetrics } from "./telemetry/metrics"

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

    async getTransaction(intentId: UUID): Promise<Result<Transaction | undefined, Error>> {
        const cachedTransaction = this.notFinalizedTransactions.find((t) => t.intentId === intentId)

        if (cachedTransaction) {
            return ok(cachedTransaction)
        }

        TxmMetrics.getInstance().databaseOperationsCounter.add(1, {
            operation: "getTransaction",
        })
        const start = Date.now()

        const persistedTransactionResult = await ResultAsync.fromPromise(
            db
                .selectFrom("transaction")
                .where("intentId", "=", intentId)
                .where("from", "=", this.transactionManager.viemWallet.account.address)
                .selectAll()
                .executeTakeFirst(),
            unknownToError,
        )

        TxmMetrics.getInstance().databaseOperationDurationHistogram.record(Date.now() - start, {
            operation: "getTransaction",
        })

        if (persistedTransactionResult.isErr()) {
            TxmMetrics.getInstance().databaseErrorsCounter.add(1, {
                operation: "getTransaction",
            })
            return err(persistedTransactionResult.error)
        }

        const persistedTransaction = persistedTransactionResult.value

        return persistedTransaction ? ok(Transaction.fromDbRow(persistedTransaction)) : ok(undefined)
    }

    async saveTransactions(transactions: Transaction[]): Promise<Result<void, Error>> {
        const transactionsToFlush = transactions.filter((t) => t.pendingFlush)

        const notPersistedTransactions = transactions.filter((t) => t.notPersisted)

        TxmMetrics.getInstance().databaseOperationsCounter.add(1, {
            operation: "saveTransactions",
        })
        const start = Date.now()

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

        TxmMetrics.getInstance().databaseOperationDurationHistogram.record(Date.now() - start, {
            operation: "saveTransactions",
        })

        if (result.isOk()) {
            this.notFinalizedTransactions = this.notFinalizedTransactions.filter((transaction) =>
                NotFinalizedStatuses.includes(transaction.status),
            )
            this.notFinalizedTransactions.push(...notPersistedTransactions)
            transactions.forEach((t) => t.markFlushed())

            TxmMetrics.getInstance().notFinalizedTransactionsGauge.record(this.notFinalizedTransactions.length)
        } else {
            TxmMetrics.getInstance().databaseErrorsCounter.add(1, {
                operation: "saveTransactions",
            })
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
        TxmMetrics.getInstance().databaseOperationsCounter.add(1, {
            operation: "purgeFinalizedTransactions",
        })
        const start = Date.now()

        const result = await ResultAsync.fromPromise(
            db
                .deleteFrom("transaction")
                .where("status", "not in", NotFinalizedStatuses)
                .where("updatedAt", "<", Date.now() - this.transactionManager.finalizedTransactionPurgeTime)
                .where("from", "=", this.transactionManager.viemWallet.account.address)
                .execute(),
            unknownToError,
        )

        TxmMetrics.getInstance().databaseOperationDurationHistogram.record(Date.now() - start, {
            operation: "purgeFinalizedTransactions",
        })

        if (result.isErr()) {
            TxmMetrics.getInstance().databaseErrorsCounter.add(1, {
                operation: "purgeFinalizedTransactions",
            })
        }

        return result
    }
}
