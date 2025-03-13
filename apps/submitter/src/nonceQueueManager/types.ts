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

    readonly bufferLimit: number

    /** Max number of buffers in total */
    readonly maxCapacity: number

    /** Current total size of all enqueued buffers */
    totalSize: number

    /** onchain nonce fetching logic */
    fetchNonce: (happyTx: Bufferable) => Promise<bigint>

    /**
     * Map to hold nonce-fetching promises. If multiple tx's are enqueued at once
     * then this prevents them all fetching the nonce onchain at the same time
     */
    nonceFetchPromises: Map<NonceTrackKey, Promise<NonceTrack>>
}

export interface NonceTrackMap {
    get(key: NonceTrackKey): NonceTrack | undefined
    set(key: NonceTrackKey, track: NonceTrack): void
    remove(key: NonceTrackKey): void

    /** Add a buffer to the user-track queue */
    addBuffer(key: NonceTrackKey, nonceValue: bigint, buffer: HappyTxBuffer, initialTotalSize: number): number

    /** Get the next buffer to process for a given user-track */
    getNextBuffer(key: NonceTrackKey): HappyTxBuffer | null

    /** Mark the active buffer as submitted */
    markActiveBufferSubmitted(key: NonceTrackKey): void

    /** Prune the most active track to make room for more */
    pruneMostActiveTrack(
        totalSize: number,
        key: NonceTrackKey,
    ): { prunedBuffers: HappyTxBuffer[]; newTotalSize: number }
}

export type NonceTrackKey = `0x${string}-${bigint}`
export type NonceRetriever = (happyTx: Bufferable) => Promise<bigint>
export type ProcessorResult<T extends Processor> = Awaited<ReturnType<T>>
