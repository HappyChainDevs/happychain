import { type UUID, unknownToError } from "@happy.tech/common"
import { bigIntToZeroPadded } from "@happy.tech/common"
import { type Result, ResultAsync } from "neverthrow"
import { type Randomness, RandomnessStatus } from "./Randomness"
import { DIGITS_MAX_UINT256 } from "./constants"
import { db } from "./db/driver"
import { randomnessEntityToRow, randomnessRowToEntity } from "./db/types"

const COMMITMENT_PRUNE_INTERVAL_BLOCKS = 60n // 2 minutes

export const FINALIZED_STATUSES = [
    RandomnessStatus.REVEAL_EXECUTED,
    RandomnessStatus.REVEAL_FAILED,
    RandomnessStatus.REVEAL_NOT_SUBMITTED_ON_TIME,
]

export class RandomnessRepository {
    // In-memory cache that maps block numbers to their corresponding Randomness
    private readonly cache = new Map<bigint, Randomness>()

    async start(): Promise<void> {
        const randomnessesDb = (await db.selectFrom("randomnesses").selectAll().execute()).map(randomnessRowToEntity)
        for (const randomness of randomnessesDb) {
            this.cache.set(randomness.blockNumber, randomness)
        }
    }

    getRandomnessForBlockNumber(blockNumber: bigint): Randomness | undefined {
        return this.cache.get(blockNumber)
    }

    getRandomnessForIntentId(intentId: UUID): Randomness | undefined {
        return Array.from(this.cache.values()).find(
            (randomness) =>
                randomness.commitmentTransactionIntentId === intentId ||
                randomness.revealTransactionIntentId === intentId,
        )
    }

    getRandomnessInStatus(status: RandomnessStatus): Randomness[] {
        return Array.from(this.cache.values()).filter((randomness) => randomness.status === status)
    }

    /**
     * Save a randomness to the database
     * Even if the operation fails, the randomness will be saved in a in-memory cache
     */
    async saveRandomness(randomness: Randomness): Promise<Result<void, Error>> {
        this.cache.set(randomness.blockNumber, randomness)
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
        this.cache.set(randomness.blockNumber, randomness)
        const row = randomnessEntityToRow(randomness)
        return await ResultAsync.fromPromise(
            db
                .updateTable("randomnesses")
                .set(row)
                .where("blockNumber", "=", bigIntToZeroPadded(randomness.blockNumber, DIGITS_MAX_UINT256))
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }

    async pruneRandomnesses(latestBlock: bigint): Promise<Result<void, Error>> {
        const cutoffBlock = latestBlock - COMMITMENT_PRUNE_INTERVAL_BLOCKS
        for (const blockNumber of this.cache.keys()) {
            if (blockNumber < cutoffBlock) {
                this.cache.delete(blockNumber)
            }
        }

        return await ResultAsync.fromPromise(
            db
                .deleteFrom("randomnesses")
                .where("blockNumber", "<", bigIntToZeroPadded(cutoffBlock, DIGITS_MAX_UINT256))
                .where("status", "in", FINALIZED_STATUSES)
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
