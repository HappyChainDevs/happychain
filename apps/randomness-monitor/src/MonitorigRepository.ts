import { unknownToError } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import type { Monitoring } from "./Monitoring"
import { db } from "./db/driver"
import { monitoringEntityToRow, monitoringRowToEntity } from "./db/types"

export class MonitoringRepository {
    async saveMonitoring(monitoring: Monitoring): Promise<Result<void, Error>> {
        const row = monitoringEntityToRow(monitoring)
        return await ResultAsync.fromPromise(db.insertInto("monitoring").values(row).execute(), unknownToError).map(
            () => undefined,
        )
    }

    async findLatestMonitoring(): Promise<Result<Monitoring | undefined, Error>> {
        const result = await ResultAsync.fromPromise(
            db.selectFrom("monitoring").selectAll().orderBy("blockNumber", "desc").limit(1).executeTakeFirst(),
            unknownToError,
        )
        if (result.isErr()) {
            return err(result.error)
        }
        return ok(result.value ? monitoringRowToEntity(result.value) : undefined)
    }
}
