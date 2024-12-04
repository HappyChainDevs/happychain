import { unknownToError } from "@happychain/common"
import type { UUID } from "@happychain/common"
import { type Result, ResultAsync } from "neverthrow"
import { Topics, eventBus } from "./EventBus.js"
import { NotFinalizedStatuses, Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { db } from "./db/driver.js"

/**
 * This module act as intermediate layer between the library and the database.
 * Its maintains an in memory copy of all the not finalized transaction to avoid to access to database and
 * improving the latency of get transactions. In addition it contains other methods helpful methods like getHighestNonce
 * that returns the biggest nonce of all the not finalized transactions that exist in the database or the flush function
 * that is used to commit all the changes that have occurred in tracked entities by the ORM in the database
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

    getNotFinalizedTransactions(): Transaction[] {
        return [...this.notFinalizedTransactions]
    }

    async getTransaction(intentId: UUID): Promise<Transaction | undefined> {
        const cachedTransaction = this.notFinalizedTransactions.find((t) => t.intentId === intentId)

        if (cachedTransaction) {
            return cachedTransaction
        }

        const persistedTransaction = await db
            .selectFrom("transaction")
            .where("intentId", "=", intentId)
            .selectAll()
            .executeTakeFirst()

        return persistedTransaction ? Transaction.fromDbRow(persistedTransaction) : undefined
    }

    async saveTransactions(transactions: Transaction[]): Promise<Result<void, Error>> {
        const result = await ResultAsync.fromPromise(
            db
                .insertInto("transaction")
                .values(transactions.map((t) => t.toDbRow()))
                .execute(),
            unknownToError,
        )

        if (result.isOk()) {
            for (const transaction of transactions) {
                if (NotFinalizedStatuses.includes(transaction.status)) {
                    this.notFinalizedTransactions.push(transaction)
                }
            }
        }
        return result.map(() => undefined)
    }

    async updateTransaction(transaction: Transaction): Promise<Result<undefined, Error>> {
        const result = await ResultAsync.fromPromise(
            db
                .updateTable("transaction")
                .set(transaction.toDbRow())
                .where("intentId", "=", transaction.intentId)
                .execute(),
            unknownToError,
        )

        this.notFinalizedTransactions = this.notFinalizedTransactions.filter((transaction) =>
            NotFinalizedStatuses.includes(transaction.status),
        )

        return result.map(() => undefined)
    }

    async updateTransactions(transactions: Transaction[]): Promise<Result<void, Error>> {
        const result = await ResultAsync.fromPromise(
            db.transaction().execute(async (dbTransaction) => {
                const promises = transactions.map((t) =>
                    dbTransaction
                        .updateTable("transaction")
                        .set(t.toDbRow())
                        .where("intentId", "=", t.intentId)
                        .execute(),
                )
                await Promise.all(promises)
            }),
            unknownToError,
        )

        this.notFinalizedTransactions = this.notFinalizedTransactions.filter((transaction) =>
            NotFinalizedStatuses.includes(transaction.status),
        )

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
            .execute()
    }
}
