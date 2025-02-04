import { type UUID, unknownToError } from "@happy.tech/common"
import { bigIntToZeroPadded } from "@happy.tech/common"
import { type Result, ResultAsync } from "neverthrow"
import type { Randomness, RandomnessStatus } from "./Randomness"
import { db } from "./db/driver"
import { randomnessEntityToRow, randomnessRowToEntity } from "./db/types"

const COMMITMENT_PRUNE_INTERVAL_SECONDS = 120n // 2 minutes

// Quantity of digits in the max uint256 value
export const DIGITS_MAX_UINT256 = 78

export class RandomnessRepository {
    private readonly map = new Map<bigint, Randomness>()

    async start(): Promise<void> {
        const randomnessesDb = (await db.selectFrom("randomnesses").selectAll().execute()).map(randomnessRowToEntity)
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
     */
    async saveRandomness(randomness: Randomness): Promise<Result<void, Error>> {
        this.map.set(randomness.timestamp, randomness)
        const row = randomnessEntityToRow(randomness)
        return await ResultAsync.fromPromise(db.insertInto("randomnesses").values(row).execute(), unknownToError).map(
            () => undefined,
        )
    }

    /**
     * Update a randomness in the database
     * Even if the operation fails, the randomness will be updated in a in-memory cache
     */
    async updateRandomness(randomness: Randomness): Promise<Result<void, Error>> {
        this.map.set(randomness.timestamp, randomness)
        const row = randomnessEntityToRow(randomness)
        return await ResultAsync.fromPromise(
            db
                .updateTable("randomnesses")
                .set(row)
                .where("timestamp", "=", bigIntToZeroPadded(randomness.timestamp, DIGITS_MAX_UINT256))
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }

    async pruneRandomnesses(latestBlockTimestamp: bigint): Promise<Result<void, Error>> {
        const cutoffTimestamp = latestBlockTimestamp - BigInt(COMMITMENT_PRUNE_INTERVAL_SECONDS)
        for (const timestamp of this.map.keys()) {
            if (timestamp < cutoffTimestamp) {
                this.map.delete(timestamp)
            }
        }

        return await ResultAsync.fromPromise(
            db
                .deleteFrom("randomnesses")
                .where(
                    "timestamp",
                    "<",
                    bigIntToZeroPadded(latestBlockTimestamp - COMMITMENT_PRUNE_INTERVAL_SECONDS, DIGITS_MAX_UINT256),
                )
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
