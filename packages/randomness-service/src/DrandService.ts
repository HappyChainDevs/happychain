import { nowInSeconds, unknownToError } from "@happychain/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import type { Hex } from "viem"
import { z } from "zod"
import { env } from "./env"

export const drandBeaconSchema = z.object({
    round: z.number(),
    signature: z.string().transform((s) => `0x${s}` as Hex),
})

export interface DrandBeacon {
    round: number
    signature: Hex
}

export enum DrandError {
    NetworkError = "NetworkError",
    InvalidResponse = "InvalidResponse",
    TooEarly = "TooEarly",
    Other = "Other",
}

export class DrandService {
    public async getDrandBeacon(round: bigint): Promise<Result<DrandBeacon, DrandError>> {
        const url = `${env.EVM_DRAND_URL}/rounds/${round}`

        const response = await ResultAsync.fromPromise(fetch(url), unknownToError)

        console.log("Response", JSON.stringify(response, null, 2))
        if (response.isErr()) {
            return err(DrandError.NetworkError)
        }

        if (!response.value.ok) {
            console.log("Response status", response.value.status)
            if (response.value.status === 425) {
                return err(DrandError.TooEarly)
            }

            return err(DrandError.Other)
        }

        const dataRaw = await response.value.json()

        const parsed = drandBeaconSchema.safeParse(dataRaw)

        if (!parsed.success) {
            return err(DrandError.InvalidResponse)
        }

        const data = parsed.data

        return ok(data)
    }

    public currentRound(): bigint {
        const currentTimestamp = nowInSeconds()
        const currentRound = Math.floor(
            (currentTimestamp - env.EVM_DRAND_GENESIS_TIMESTAMP_SECONDS) / env.EVM_DRAND_PERIOD_SECONDS,
        )
        return BigInt(currentRound)
    }
}
