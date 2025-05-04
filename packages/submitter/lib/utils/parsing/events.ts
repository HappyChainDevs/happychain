import type { Hex } from "@happy.tech/common"
import { type Log, decodeEventLog, toEventSelector } from "viem"
import { eventsAbi } from "./abis"

/**
 * An ABI-decoded event.
 */
export type DecodedEvent = {
    /** Name of the event. */
    eventName: string
    /** Map argument names to their values. */
    args: Record<string, unknown>
}

/**
 * Attempts to decode the given log against known abis, returning the result or undefined if not known.
 */
export function decodeEvent(log: Log): DecodedEvent | undefined {
    try {
        // the cast is safe: args may be `readonly string[]` but we always specify argument names in the ABI
        return decodeEventLog({ abi: eventsAbi, data: log.data, topics: log.topics }) as DecodedEvent
    } catch {
        return
    }
}

/**
 * Converts a known event name into its 4 bytes selector, or return undefined if the event isn't known.
 */
export function getSelectorFromEventName(name: string): Hex | undefined {
    const item = eventsAbi.find((a) => a.name === name)
    // toErrorSelector? who needs that? :')
    return item ? toEventSelector(item) : undefined
}
