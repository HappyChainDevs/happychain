import { fetchWithRetry, nowInSeconds, promiseWithResolvers, sleep, unknownToError } from "@happy.tech/common"
import type { Transaction } from "@happy.tech/txm"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import type { Hex } from "viem"
import { z } from "zod"
import { Drand } from "./Drand"
import type { DrandRepository } from "./DrandRepository"
import type { TransactionFactory } from "./TransactionFactory"
import { env } from "./env"

const drandBeaconSchema = z.object({
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

const MS_IN_SECOND = 1000

export class DrandService {
    private readonly drandRepository: DrandRepository
    private readonly transactionFactory: TransactionFactory
    private pendingPostDrandTransactions: Transaction[] = []
    private getDrandBeaconLocked = false
    private pendingGetDrandBeaconPromises: PromiseWithResolvers<void>[] = []

    constructor(drandRepository: DrandRepository, transactionFactory: TransactionFactory) {
        this.drandRepository = drandRepository
        this.transactionFactory = transactionFactory
    }

    async start() {
        // Synchronize the retrieval of new Drand beacons with the Drand network to request them as soon as they become available.
        const periodMs = Number(env.EVM_DRAND_PERIOD_SECONDS) * MS_IN_SECOND
        const drandGenesisTimestampMs = Number(env.EVM_DRAND_GENESIS_TIMESTAMP_SECONDS) * MS_IN_SECOND
        const now = Date.now()

        // Calculates timestamp for the next Drand beacon:
        // 1. Obtains the elapsed time since genesis: now - drandGenesisTimestampMs.
        // 2. Divides this time by the period (periodMs) and rounds up to get the next round.
        // 3. Converts the next round back to an absolute timestamp by multiplying by periodMs and adding drandGenesisTimestampMs.
        const nextDrandBeaconTimestamp =
            Math.ceil((now - drandGenesisTimestampMs) / periodMs) * periodMs + drandGenesisTimestampMs
        await sleep(nextDrandBeaconTimestamp - now)

        setInterval(async () => {
            await this.handleNewDrandBeacons()
        }, periodMs)
    }

    async getDrandBeacon(round: bigint): Promise<Result<DrandBeacon, DrandError>> {
        if (round <= 0n) {
            return err(DrandError.InvalidRound)
        }

        const url = `${env.EVM_DRAND_URL}/rounds/${round}`
        const response = await ResultAsync.fromPromise(fetchWithRetry(url, {}, 2, 1000), unknownToError)

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

        const parsed = drandBeaconSchema.safeParse(dataRaw)

        if (!parsed.success) {
            return err(DrandError.InvalidResponse)
        }

        return ok(parsed.data)
    }

    currentRound(): bigint {
        const currentTimestamp = nowInSeconds()
        const currentRound = Math.floor(
            (currentTimestamp - Number(env.EVM_DRAND_GENESIS_TIMESTAMP_SECONDS)) /
                Number(env.EVM_DRAND_PERIOD_SECONDS) +
                1,
        )
        return BigInt(currentRound)
    }

    pullDrandTransactions() {
        const returnTransactions = this.pendingPostDrandTransactions
        this.pendingPostDrandTransactions = []
        return returnTransactions
    }

    // Implements a mutex to ensure that only one instance of this function executes at a time.
    // Calls made while the mutex is locked are queued as pending promises.
    // When the current execution completes, the most recent pending promise is immediately resolved,
    // allowing it to proceed without waiting for the next interval, while any other queued promises are rejected.
    async handleNewDrandBeacons() {
        if (this.getDrandBeaconLocked) {
            const pending = promiseWithResolvers<void>()
            this.pendingGetDrandBeaconPromises.push(pending)

            try {
                await pending.promise
            } catch {
                return
            }
        }

        this.getDrandBeaconLocked = true
        try {
            await this._handleNewDrandBeacons()
        } catch (error) {
            console.error("Error in handleNewDrandBeacons: ", error)
        }
        this.getDrandBeaconLocked = false

        this.pendingGetDrandBeaconPromises.pop()?.resolve()
        this.pendingGetDrandBeaconPromises.forEach((p) => p.reject())
    }

    private async _handleNewDrandBeacons() {
        const currentRound = this.currentRound()
        const drandGaps = this.drandRepository.findRoundGapsInRange(currentRound - env.EVM_DRAND_MARGIN, currentRound)

        await Promise.all(
            drandGaps.map(async (round) => {
                let drandBeacon = await this.getDrandBeacon(round)
                if (drandBeacon.isErr()) {
                    if (drandBeacon.error !== DrandError.TooEarly) {
                        console.error("Failed to get drand beacon", drandBeacon.error)
                        return
                    }

                    await sleep(1000)
                    drandBeacon = await this.getDrandBeacon(round)

                    if (drandBeacon.isErr()) {
                        console.error("Failed to get drand beacon", drandBeacon.error)
                        return
                    }
                }

                const postDrandTransactionResult = this.transactionFactory.createPostDrandTransaction({
                    round: round,
                    signature: drandBeacon.value.signature,
                })

                if (postDrandTransactionResult.isErr()) {
                    console.error("Failed to create post drand transaction", postDrandTransactionResult.error)
                    return
                }

                const postDrandTransaction = postDrandTransactionResult.value

                const drand = Drand.create({
                    round: round,
                    signature: drandBeacon.value.signature,
                    transactionIntentId: postDrandTransaction.intentId,
                })

                const drandSaved = await this.drandRepository.saveDrand(drand)

                if (drandSaved.isErr()) {
                    console.error("Failed to save drand", drandSaved.error)
                    return
                }

                this.pendingPostDrandTransactions.push(postDrandTransaction)
            }),
        )
    }
}
