import { fetchWithRetry, nowInSeconds, unknownToError } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import type { Hex } from "viem"
import { z } from "zod"
import { env } from "./env"

export const drandBeaconSchema = z.object({
    round: z.number().int().positive(),
    signature: z
        .string()
        .transform((s) => s.toLowerCase())
        .refine((s) => s.length === 128, {
            message: "Signature must be 128 characters long",
        })
        .transform((s) => `0x${s}` as Hex)
        .refine((s) => /^0x[0-9a-f]+$/.test(s), {
            message: "Signature must contain only hexadecimal characters",
        }),
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
    InvalidRound = "InvalidRound",
}

export class DrandService {
    public async getDrandBeacon(round: bigint): Promise<Result<DrandBeacon, DrandError>> {
        if (round <= 0n) {
            return err(DrandError.InvalidRound)
        }

        const url = `${env.EVM_DRAND_URL}/rounds/${round}`
        const response = await ResultAsync.fromPromise(fetchWithRetry(url, {}, 2, 500), unknownToError)

        if (response.isErr()) {
            return err(DrandError.NetworkError)
        }

        if (!response.value.ok) {
            if (response.value.status === 425) {
                return err(DrandError.TooEarly)
            }

            console.error("Drand beacon fetch error status", response.value.status)
            return err(DrandError.Other)
        }

        const dataRaw = await response.value.json()

        console.log(dataRaw)
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
            (currentTimestamp - Number(env.EVM_DRAND_GENESIS_TIMESTAMP_SECONDS)) /
                Number(env.EVM_DRAND_PERIOD_SECONDS) +
                1,
        )
        return BigInt(currentRound)
    }
}
