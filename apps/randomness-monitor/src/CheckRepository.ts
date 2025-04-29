import { unknownToError } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import { db } from "./db/driver"
import { checkEntityToRow, checkRowToEntity } from "./db/types"
import type { Check } from "./Check"

const PRUNE_BLOCK_TIMESTAMP_THRESHOLD_SECONDS = 60 * 60 * 24 * 30 // 30 days

export class CheckRepository {
    async saveCheck(check: Check): Promise<Result<void, Error>> {
        const row = checkEntityToRow(check)

        return await ResultAsync.fromPromise(db.insertInto("checks").values(row).execute(), unknownToError).map(
            () => undefined,
        )
    }

    async findLatestCheck(): Promise<Result<Check | undefined, Error>> {
        const result = await ResultAsync.fromPromise(
            db.selectFrom("checks").selectAll().orderBy("blockNumber", "desc").limit(1).executeTakeFirst(),
            unknownToError,
        )
        if (result.isErr()) {
            return err(result.error)
        }
        return ok(result.value ? checkRowToEntity(result.value) : undefined)
    }

    async pruneChecks(blockTimestamp: bigint): Promise<Result<void, Error>> {
        return await ResultAsync.fromPromise(
            db
                .deleteFrom("checks")
                .where("blockTimestamp", "<", Number(blockTimestamp) - PRUNE_BLOCK_TIMESTAMP_THRESHOLD_SECONDS)
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
