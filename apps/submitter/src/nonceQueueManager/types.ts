import type { HappyTx } from "#src/tmp/interface/HappyTx"

// biome-ignore lint/suspicious/noExplicitAny: needed for enqueueBuffer return type to behave
export type Processor = (args: any) => unknown

/**
 * Minimal subset of HappyTx required for successful buffer management
 */
export type Bufferable = Pick<HappyTx, "account" | "nonceTrack" | "nonceValue">

export type HappyTxBuffer = {
    happyTx: Bufferable
    resolve: (value?: unknown) => void
    reject: (reason?: unknown) => void
}

export interface NonceTrack {
    queue: Map<bigint, HappyTxBuffer>
    running: boolean
    nextNonce: bigint
    activeBuffer: HappyTxBuffer | null
}

export interface NonceQueueManager<T extends Processor = Processor> {
    /** all pending buffers, keyed by user-track */
    tracks: NonceTrackMap
    /** onchain processing logic (execute, submit, etc) */
    processor: T
    /** Max number of buffers per user */
    bufferLimit: number
    /** Max number of buffers in total */
    maxCapacity: number
    /** Current total size of all enqueued buffers */
    totalSize: number

    /** onchain nonce fetching logic */
    fetchNonce: (happyTx: Bufferable) => Promise<bigint>
    /**
     * Map to hold nonce-fetching promises. If multiple tx's are enqueued at once
     * then this prevents them all fetching the nonce onchain at the same time
     */
    nonceFetchPromises: Map<string, Promise<NonceTrack>>
}

export type NonceTrackMap = Map<string, NonceTrack>
