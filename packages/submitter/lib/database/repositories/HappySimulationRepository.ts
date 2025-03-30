import type { Insertable, Kysely } from "kysely"
// TODO we should commit this file
import type { DB, HappySimulation } from "#lib/database/generated"

// TODO Simulations have short lifespans, why do we need to store them in-db vs in-memory?
//      It's okay if we lose them on a crash — we'll just resimulate.
//      (Unlike boops where we want to record them befre answering on submit or before sending them
//       for onchain execution).

export class HappySimulationRepository {
    constructor(private db: Kysely<DB>) {}

    async findByHappyTxHash(happyTxHash: string) {
        const query = this.db
            .selectFrom("happy_simulations")
            .selectAll()
            // TODO why not .selectAll() ? — ditto other files
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
                // TODO why not .doUpdateSet(state) ? — ditto other files
                // TODO even better: s/insertInto/replaceInto
                oc
                    .column("happyTxHash")
                    .doUpdateSet({
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
            // TODO what's up here?
            .executeTakeFirst()) as HappySimulation | undefined // TODO: bug in code-gen update - Generated<number | null> column error?
    }
}
