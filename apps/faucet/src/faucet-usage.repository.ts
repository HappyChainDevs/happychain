import { unknownToError } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import { db } from "./db/driver"
import { env } from "./env"
import { FaucetUsage } from "./faucet-usage.entity"

const PRUNE_FAUCET_USAGE_INTERVAL_MILLISECONDS = 1000 * 60 // 1 minute

export class FaucetUsageRepository {
    constructor() {
        setInterval(async () => {
            this.pruneFaucetUsage()
        }, PRUNE_FAUCET_USAGE_INTERVAL_MILLISECONDS)
    }

    async save(faucetUsage: FaucetUsage): Promise<Result<void, Error>> {
        const result = await ResultAsync.fromPromise(
            db.insertInto("faucetUsage").values(faucetUsage.toRow()).execute(),
            unknownToError,
        )

        if (result.isErr()) {
            return err(result.error)
        }
        return ok(undefined)
    }

    async findAllByAddress(address: Address): Promise<Result<FaucetUsage[], Error>> {
        const result = await ResultAsync.fromPromise(
            db.selectFrom("faucetUsage").selectAll().where("address", "=", address).execute(),
            unknownToError,
        )

        if (result.isErr()) {
            return err(result.error)
        }
        return ok(result.value.map(FaucetUsage.fromRow))
    }

    async pruneFaucetUsage(): Promise<Result<void, Error>> {
        return await ResultAsync.fromPromise(
            db
                .deleteFrom("faucetUsage")
                .where("occurredAt", "<", BigInt(Date.now() - env.FAUCET_RATE_LIMIT_WINDOW_SECONDS * 1000))
                .execute(),
            unknownToError,
        ).map(() => undefined)
    }
}
