import { unknownToError } from "@happychain/common"
import { type Result, ResultAsync } from "neverthrow"
import { NotFinalizedStatuses, Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { db } from "./db/driver.js"

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
            .where("status", "<@", NotFinalizedStatuses)
            .selectAll()
            .execute()

        this.notFinalizedTransactions = transactionRows.map((row) => new Transaction(row))
    }

    getNotFinalizedTransactions(): Transaction[] {
        return [...this.notFinalizedTransactions]
    }

    async saveTransactions(transactions: Transaction[]): Promise<Result<void, Error>> {
        const result = await ResultAsync.fromPromise(
            db.transaction().execute(async (dbTransaction) => {
                const promises = transactions.map((t) =>
                    dbTransaction.insertInto("transaction").values(t.toDbRow()).execute(),
                )
                await Promise.all(promises)
            }),
            unknownToError,
        )

        if (result.isOk()) {
            for (const transaction of transactions) {
                if (NotFinalizedStatuses.includes(transaction.status)) {
                    this.notFinalizedTransactions.push(transaction)
                }
            }
        }
        return result
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
}
