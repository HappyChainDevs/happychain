import crypto from "node:crypto"
import { type UUID, unknownToError } from "@happychain/common"
import { sql } from "kysely"
import { type Result, ResultAsync } from "neverthrow"
import type { Hex } from "viem"
import { encodePacked, keccak256 } from "viem"
import { db } from "./db/driver"
import { commitmentInfoToDb, dbToCommitmentInfo } from "./db/types"

export interface CommitmentInfo {
    timestamp: bigint
    value: bigint
    commitment: Hex
    transactionIntentId: UUID
}

const COMMITMENT_PRUNE_INTERVAL_SECONDS = 120n // 2 minutes

export class CommitmentManager {
    private readonly map = new Map<bigint, CommitmentInfo>()

    async start(): Promise<void> {
        const commitmentsDb = (await db.selectFrom("commitments").selectAll().execute()).map(dbToCommitmentInfo)
        for (const commitment of commitmentsDb) {
            this.map.set(commitment.timestamp, commitment)
        }
    }

    generateCommitment(): Omit<CommitmentInfo, "transactionIntentId" | "timestamp"> {
        const value = this.generateRandomness()
        const commitment = this.hashValue(value)
        const commitmentObject = { value, commitment }
        return commitmentObject
    }

    setCommitmentForTimestamp(commitment: CommitmentInfo): void {
        this.map.set(commitment.timestamp, commitment)
    }

    async saveCommitment(commitment: CommitmentInfo): Promise<Result<void, Error>> {
        const result = await ResultAsync.fromPromise(
            db.insertInto("commitments").values(commitmentInfoToDb(commitment)).execute(),
            unknownToError,
        )

        return result.map(() => undefined)
    }

    getCommitmentForTimestamp(timestamp: bigint): CommitmentInfo | undefined {
        return this.map.get(timestamp)
    }

    async pruneCommitments(latestBlockTimestamp: bigint): Promise<Result<void, Error>> {
        return ResultAsync.fromPromise(
            db
                .deleteFrom("commitments")
                .where(
                    sql<number>`CAST("timestamp" AS INTEGER)`,
                    "<",
                    Number(latestBlockTimestamp - COMMITMENT_PRUNE_INTERVAL_SECONDS),
                )
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }

    private generateRandomness(): bigint {
        const bytes = crypto.randomBytes(32)
        let hex = "0x"

        for (const byte of bytes) {
            hex += byte.toString(16).padStart(2, "0")
        }

        return BigInt(hex)
    }

    private hashValue(value: bigint): Hex {
        return keccak256(encodePacked(["uint256"], [value]))
    }
}
