import type { Insertable, Kysely } from "kysely"
import type * as Schema from "#lib/database/generated"
import { Tables, auto } from "#lib/database/tables"

export class BoopTransactionRepository {
    constructor(private db: Kysely<Schema.DB>) {}

    async findByBoopHash(boopHash: `0x${string}`): Promise<Schema.Boop | undefined> {
        return await this.db.selectFrom(Tables.Boops).selectAll().where("boopHash", "=", boopHash).executeTakeFirst()
    }

    async insert(state: Insertable<Schema.Boop>): Promise<Schema.Boop | undefined> {
        return await this.db //
            .insertInto(Tables.Boops)
            .values({ ...state, id: auto })
            .onConflict((oc) =>
                // If the previous tx failed, and is retried with the exact same data,
                // this will be a conflict on txHash, all signed data will be the same
                // but we should update the unsigned data
                oc
                    .column("boopHash")
                    .doUpdateSet({
                        executeGasLimit: state.executeGasLimit,
                        extraData: state.extraData,
                        gasLimit: state.gasLimit,
                        maxFeePerGas: state.maxFeePerGas,
                        submitterFee: state.submitterFee,
                        validatorData: state.validatorData,
                    }),
            )
            .returningAll()
            .executeTakeFirst()
    }
}
