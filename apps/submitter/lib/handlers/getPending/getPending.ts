import type { Hash } from "@happy.tech/common"
import { trace } from "@opentelemetry/api"
import { outputForGenericError } from "#lib/handlers/errors"
import { boopNonceManager, boopStore, computeHash } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces"
import { GetPending, type GetPendingInput, type GetPendingOutput, type PendingBoopInfo } from "./types"

async function getPending({ account }: GetPendingInput): Promise<GetPendingOutput> {
    try {
        const boopHashes: Hash[] = []
        const pending = boopStore
            .getByAccount(account)
            .map((boop) => {
                const boopHash = computeHash(boop)
                boopHashes.push(boopHash)
                return {
                    boopHash,
                    entryPoint: boopStore.getEntryPoint(boopHash)!,
                    nonceTrack: boop.nonceTrack,
                    nonceValue: boop.nonceValue,
                    // If the boop isn't blocked but is in the store, it must have been submitted (or it is about to be).
                    submitted: !boopNonceManager.has(boop),
                } satisfies PendingBoopInfo
            })
            .sort((a, b) => {
                return Math.sign(Number(a.nonceTrack - b.nonceTrack)) || Math.sign(Number(a.nonceValue - b.nonceValue))
            })

        const activeSpan = trace.getActiveSpan()
        activeSpan?.setAttribute("boopHashes", boopHashes)
        return { status: GetPending.Success, account, pending }
    } catch (error) {
        return outputForGenericError(error)
    }
}

const tracedGetPending = traceFunction(getPending, "getPending")

export { tracedGetPending as getPending }
