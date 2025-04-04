import { unknownToError } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import type { Monitoring } from "./Monitoring"
import { db } from "./db/driver"
import { monitoringEntityToRow, monitoringRowToEntity } from "./db/types"

const PRUNE_BLOCK_TIMESTAMP_THRESHOLD_SECONDS = 60 * 60 * 24 * 30 // 30 days

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

    async pruneMonitoring(blockTimestamp: bigint): Promise<Result<void, Error>> {
        return await ResultAsync.fromPromise(
            db.deleteFrom("monitoring").where("blockTimestamp", "<", Number(blockTimestamp) - PRUNE_BLOCK_TIMESTAMP_THRESHOLD_SECONDS).execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
