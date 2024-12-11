import { type UUID, unknownToError } from "@happychain/common"
import { type Result, ResultAsync } from "neverthrow"
import { FINALIZED_STATUSES, Randomness, type RandomnessStatus } from "./Randomness"
import { db } from "./db/driver"
import type { RandomnessRow } from "./db/types"

const COMMITMENT_PRUNE_INTERVAL_SECONDS = 60 * 2 // 2 minutes

export class RandomnessRepository {
    private readonly map = new Map<bigint, Randomness>()

    private rowToEntity(row: RandomnessRow): Randomness {
        return new Randomness({
            timestamp: BigInt(row.timestamp),
            value: BigInt(row.value),
            hashedValue: row.hashedValue,
            commitmentTransactionIntentId: row.commitmentTransactionIntentId,
            revealTransactionIntentId: row.revealTransactionIntentId,
            status: row.status,
        })
    }

    private entityToRow(entity: Randomness): RandomnessRow {
        return {
            timestamp: Number(entity.timestamp),
            value: entity.value.toString(),
            hashedValue: entity.hashedValue,
            commitmentTransactionIntentId: entity.commitmentTransactionIntentId,
            revealTransactionIntentId: entity.revealTransactionIntentId,
            status: entity.status,
        }
    }

    async start(): Promise<void> {
        const randomnessesDb = (await db.selectFrom("randomnesses").selectAll().execute()).map(this.rowToEntity)
        for (const randomness of randomnessesDb) {
            this.map.set(randomness.timestamp, randomness)
        }
    }

    getRandomnessForTimestamp(timestamp: bigint): Randomness | undefined {
        return this.map.get(timestamp)
    }

    getRandomnessForIntentId(intentId: UUID): Randomness | undefined {
        return Array.from(this.map.values()).find(
            (randomness) =>
                randomness.commitmentTransactionIntentId === intentId ||
                randomness.revealTransactionIntentId === intentId,
        )
    }

    getRandomnessInTimeRange(start: bigint, end: bigint): Randomness[] {
        return Array.from(this.map.values()).filter(
            (randomness) => randomness.timestamp >= start && randomness.timestamp <= end,
        )
    }

    getRandomnessInStatus(status: RandomnessStatus): Randomness[] {
        return Array.from(this.map.values()).filter((randomness) => randomness.status === status)
    }

    /**
     * Save a randomness to the database
     * Even if the operation fails, the randomness will be saved in a in-memory cache
     * @param randomness - The randomness to save
     * @returns A result indicating the success or failure of the operation
     */
    async saveRandomness(randomness: Randomness): Promise<Result<void, Error>> {
        this.map.set(randomness.timestamp, randomness)
        const row = this.entityToRow(randomness)
        return ResultAsync.fromPromise(db.insertInto("randomnesses").values(row).execute(), unknownToError).map(
            () => undefined,
        )
    }

    /**
     * Update a randomness in the database
     * Even if the operation fails, the randomness will be updated in a in-memory cache
     * @param randomness - The randomness to update
     * @returns A result indicating the success or failure of the operation
     */
    async updateRandomness(randomness: Randomness): Promise<Result<void, Error>> {
        this.map.set(randomness.timestamp, randomness)
        const row = this.entityToRow(randomness)
        return ResultAsync.fromPromise(
            db.updateTable("randomnesses").set(row).where("timestamp", "=", Number(randomness.timestamp)).execute(),
            unknownToError,
        ).map(() => undefined)
    }

    async pruneRandomnesses(latestBlockTimestamp: bigint): Promise<Result<void, Error>> {
        return ResultAsync.fromPromise(
            db
                .deleteFrom("randomnesses")
                .where("timestamp", "<", Number(latestBlockTimestamp) - COMMITMENT_PRUNE_INTERVAL_SECONDS)
                .where("status", "in", FINALIZED_STATUSES)
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
