import type { Insertable, Kysely } from "kysely"
import type { DB, HappySimulation } from "#lib/database/generated"

export class HappySimulationRepository {
    constructor(private db: Kysely<DB>) {}

    async findByHappyTxHash(happyTxHash: string) {
        const query = this.db
            .selectFrom("happy_simulations")
            .select([
                "happy_simulations.status",
                "happy_simulations.validationStatus",
                "happy_simulations.revertData",
                "happy_simulations.failureReason",
                "happy_simulations.entryPoint",
            ])
            .where("happyTxHash", "=", happyTxHash)

        return await query.executeTakeFirst()
    }

    async insert(state: Insertable<HappySimulation>): Promise<HappySimulation | undefined> {
        return (await this.db //
            .insertInto("happy_simulations")
            .values(state)
            .onConflict((oc) =>
                oc.column("happyTxHash").doUpdateSet({
                    status: state.status,
                    validationStatus: state.validationStatus,
                    gas: state.gas,
                    executeGas: state.executeGas,
                    revertData: state.revertData,
                    failureReason: state.failureReason,
                    entryPoint: state.entryPoint,
                }),
            )
            .returningAll()
            .executeTakeFirst()) as HappySimulation | undefined // TODO: bug in code-gen update - Generated<number | null> column error?
    }
}
