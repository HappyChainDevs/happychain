import type { Insertable, Kysely } from "kysely"
import type { BoopTransaction, DB } from "#lib/database/generated"

export class BoopTransactionRepository {
    constructor(private db: Kysely<DB>) {}

    async findByBoopHash(boopHash: `0x${string}`): Promise<BoopTransaction | undefined> {
        return await this.db
            .selectFrom("boop_transactions")
            .selectAll()
            .where("boopHash", "=", boopHash)
            .executeTakeFirst()
    }

    async insert(state: Insertable<BoopTransaction>): Promise<BoopTransaction | undefined> {
        const {
            account,
            callData,
            dest,
            entryPoint,
            executeGasLimit,
            validateGasLimit,
            validatePaymentGasLimit,
            extraData,
            gasLimit,
            boopHash,
            maxFeePerGas,
            nonceTrack,
            nonceValue,
            payer,
            submitterFee,
            validatorData,
            value,
        } = state
        const data = await this.db //
            .insertInto("boop_transactions")
            .values({
                account,
                callData,
                dest,
                entryPoint,
                executeGasLimit,
                validateGasLimit,
                validatePaymentGasLimit,
                extraData,
                gasLimit,
                boopHash,
                maxFeePerGas,
                nonceTrack,
                nonceValue,
                payer,
                submitterFee,
                validatorData,
                value,
            })
            .onConflict((oc) =>
                // If the previous tx failed, and is retried with the exact same data,
                // this will be a conflict on txHash, all signed data will be the same
                // but we should update the unsigned data
                oc
                    .column("boopHash")
                    .doUpdateSet({
                        executeGasLimit,
                        extraData,
                        gasLimit,
                        maxFeePerGas,
                        submitterFee,
                        validatorData,
                    }),
            )
            .returningAll()
            .executeTakeFirst()
        return data
    }
}
