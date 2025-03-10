import type { Kysely } from "kysely"
import type { DB, HappyTransaction } from "#src/database/generated"

export class HappyTransactionRepository {
    constructor(private db: Kysely<DB>) {}

    async findByHappyTxHash(happyTxHash: `0x${string}`) {
        return await this.db
            .selectFrom("happy_transactions")
            .selectAll()
            .where("happyTxHash", "=", happyTxHash)
            .executeTakeFirst()
    }

    async insert(state: Omit<HappyTransaction, "id">): Promise<HappyTransaction | undefined> {
        const data = await this.db //
            .insertInto("happy_transactions")
            .values(state)
            // If the previous tx failed, and is retried with the exact same data,
            // this will be a conflict on txHash, all signed data will be the same
            // but we should update the unsigned data
            .onConflict((oc) =>
                oc.column("happyTxHash").doUpdateSet({
                    gasLimit: state.gasLimit,
                    executeGasLimit: state.executeGasLimit,
                    maxFeePerGas: state.maxFeePerGas,
                    submitterFee: state.submitterFee,
                    paymasterData: state.paymasterData,
                    validatorData: state.validatorData,
                    extraData: state.extraData,
                }),
            )
            .returningAll()
            .executeTakeFirst()
        return data as HappyTransaction | undefined
    }

    async update(id: number, updates: Partial<Omit<HappyTransaction, "id">>) {
        return await this.db
            .updateTable("happy_transactions")
            .set(updates)
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst()
    }
}
