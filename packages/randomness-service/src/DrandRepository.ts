import { type Hex, type UUID, unknownToError } from "@happychain/common"
import { type Result, ResultAsync } from "neverthrow"
import { Drand, DrandStatus } from "./Drand"
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
            round: entity.round.toString(),
            signature: entity.signature,
            status: entity.status,
            transactionIntentId: entity.transactionIntentId,
        }
    }

    public async start(): Promise<void> {
        const drandsDb = (await db.selectFrom("drands").selectAll().execute()).map(this.rowToEntity)

        this.cache.push(...drandsDb)
    }

    public async saveDrand(drand: Drand): Promise<Result<void, Error>> {
        const row = this.entityToRow(drand)
        this.cache.push(drand)
        return ResultAsync.fromPromise(db.insertInto("drands").values(row).execute(), unknownToError).map(
            () => undefined,
        )
    }

    public getOldestDrandRound(): bigint | undefined {
        if (this.cache.length === 0) {
            return undefined
        }
        return this.cache.reduce((acc, drand) => (drand.round < acc ? drand.round : acc), this.cache[0].round)
    }

    public findRoundGapsInRange(startRound: bigint, endRound: bigint): bigint[] {
        const roundGaps = []
        // TODO: Use a more efficient algorithm to find round gaps
        for (let round = startRound; round < endRound; round++) {
            if (!this.cache.find((drand) => drand.round === round)) {
                roundGaps.push(round)
            }
        }
        return roundGaps
    }

    public getDrand(round: bigint): Drand | undefined {
        return this.cache.find((drand) => drand.round === round)
    }

    public getDrandByTransactionIntentId(transactionIntentId: UUID): Drand | undefined {
        return this.cache.find((drand) => drand.transactionIntentId === transactionIntentId)
    }

    public getPendingDrands(): Drand[] {
        return this.cache.filter((drand) => drand.status === DrandStatus.PENDING)
    }

    public async updateDrand(drand: Drand): Promise<Result<void, Error>> {
        const row = this.entityToRow(drand)
        return ResultAsync.fromPromise(
            db.updateTable("drands").set(row).where("round", "=", row.round).execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
