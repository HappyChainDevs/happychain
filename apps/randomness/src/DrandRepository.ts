import { type Hex, type UUID, bigIntToZeroPadded, unknownToError } from "@happy.tech/common"
import { type Result, ResultAsync } from "neverthrow"
import { Drand } from "./Drand"
import { DIGITS_MAX_UINT256 } from "./constants"
import { db } from "./db/driver"
import type { DrandRow } from "./db/types"

export class DrandRepository {
    private cache: Drand[] = []

    private rowToEntity(row: DrandRow): Drand {
        return new Drand({
            round: BigInt(row.round),
            signature: row.signature as Hex,
            status: row.status,
            transactionIntentId: row.transactionIntentId,
        })
    }

    private entityToRow(entity: Drand): DrandRow {
        return {
            round: bigIntToZeroPadded(entity.round, DIGITS_MAX_UINT256),
            signature: entity.signature,
            status: entity.status,
            transactionIntentId: entity.transactionIntentId,
        }
    }

    async start(): Promise<void> {
        const drandsDb = (await db.selectFrom("drands").selectAll().execute()).map(this.rowToEntity)

        this.cache.push(...drandsDb)
    }

    async saveDrand(drand: Drand): Promise<Result<void, Error>> {
        const row = this.entityToRow(drand)

        const result = await ResultAsync.fromPromise(db.insertInto("drands").values(row).execute(), unknownToError)

        if (result.isOk()) {
            this.cache.push(drand)
        }

        return result.map(() => undefined)
    }

    getOldestDrandRound(): bigint | undefined {
        if (this.cache.length === 0) {
            return undefined
        }
        return this.cache.reduce((acc, drand) => (drand.round < acc ? drand.round : acc), this.cache[0].round)
    }

    findRoundGapsInRange(startRound: bigint, endRound: bigint): bigint[] {
        const roundGaps = []
        for (let round = startRound; round <= endRound; round++) {
            if (!this.cache.find((drand) => drand.round === round)) {
                roundGaps.push(round)
            }
        }
        return roundGaps
    }

    getDrand(round: bigint): Drand | undefined {
        return this.cache.find((drand) => drand.round === round)
    }

    getDrandByTransactionIntentId(transactionIntentId: UUID): Drand | undefined {
        return this.cache.find((drand) => drand.transactionIntentId === transactionIntentId)
    }

    async updateDrand(drand: Drand): Promise<Result<void, Error>> {
        const row = this.entityToRow(drand)
        return ResultAsync.fromPromise(
            db
                .updateTable("drands")
                .set(row)
                .where("round", "=", bigIntToZeroPadded(drand.round, DIGITS_MAX_UINT256))
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
