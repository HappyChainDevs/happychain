import type { Insertable, Kysely } from "kysely"
import type { DB, HappyTransaction } from "#lib/database/generated"

export class HappyTransactionRepository {
    constructor(private db: Kysely<DB>) {}

    async findByHappyTxHash(happyTxHash: `0x${string}`): Promise<HappyTransaction | undefined> {
        return await this.db
            .selectFrom("happy_transactions")
            .selectAll()
            .where("happyTxHash", "=", happyTxHash)
            .executeTakeFirst()
    }

    async insert(state: Insertable<HappyTransaction>): Promise<HappyTransaction | undefined> {
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
            happyTxHash,
            maxFeePerGas,
            nonceTrack,
            nonceValue,
            paymaster,
            paymasterData,
            submitterFee,
            validatorData,
            value,
        } = state
        const data = await this.db //
            .insertInto("happy_transactions")
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
                happyTxHash,
                maxFeePerGas,
                nonceTrack,
                nonceValue,
                paymaster,
                paymasterData,
                submitterFee,
                validatorData,
                value,
            })
            .onConflict((oc) =>
                // If the previous tx failed, and is retried with the exact same data,
                // this will be a conflict on txHash, all signed data will be the same
                // but we should update the unsigned data
                oc
                    .column("happyTxHash")
                    .doUpdateSet({
                        executeGasLimit,
                        extraData,
                        gasLimit,
                        maxFeePerGas,
                        paymasterData,
                        submitterFee,
                        validatorData,
                    }),
            )
            .returningAll()
            .executeTakeFirst()
        return data
    }
}
