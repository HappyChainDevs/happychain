import {
    addBuffer,
    clearActiveBuffer,
    createNonceTrackMap,
    getNextBuffer,
    getTrack,
    pruneMostActiveTrack,
    setTrack,
} from "./nonceTrackMap"
import type { Bufferable, HappyTxBuffer, NonceQueueManager, NonceTrack, Processor } from "./types"

type NonceRetriever = (happyTx: Bufferable) => Promise<bigint>

/**
 * Initializes and returns a NonceQueueManager object.
 * @param {number} bufferLimit - The buffer limit for each track.
 * @param {number} maxCapacity - The maximum capacity of buffers.
 * @returns {NonceQueueManager} A new NonceQueueManager object.
 */
export function createNonceQueueManager<T extends Processor>(
    bufferLimit: number,
    maxCapacity: number,
    processor: T,
    fetchNonce: NonceRetriever,
): NonceQueueManager<T> {
    return {
        tracks: createNonceTrackMap(),
        processor,
        fetchNonce,
        bufferLimit,
        maxCapacity,
        totalSize: 0,
        nonceFetchPromises: new Map(),
    }
}

/**
 * Adds a happyTx to the appropriate nonceTrack's queue and starts processing if not already running.
 * @param {NonceQueueManager} manager - The manager object.
 * @param {Intent} intent - The intent object.
 * @returns {Promise<ReturnType<typeof manager.processor>>} A promise that resolves with the result of processing the buffer.
 * @throws {Error} If the buffer manager capacity is exceeded or buffer limit is exceeded.
 */
export async function enqueueBuffer<T extends Processor, THappyBuffer extends Bufferable>(
    manager: NonceQueueManager<T>,
    happyTx: THappyBuffer,
): Promise<ReturnType<typeof manager.processor>> {
    const key = `${happyTx.account}-${happyTx.nonceTrack}`

    const oldTrack = getTrack(manager.tracks, key)

    const track = (oldTrack?.running && oldTrack) || (await initializeTrack(manager, key, happyTx))

    if (manager.totalSize >= manager.maxCapacity) {
        const { prunedBuffers, newTotalSize } = pruneMostActiveTrack(manager.tracks, manager.totalSize)
        manager.totalSize = newTotalSize
        if (prunedBuffers.length === 0) {
            throw new Error("bufferManagerCapacityExceeded")
        }
    }
    if (track && track.queue.size >= manager.bufferLimit - 1) {
        throw new Error("bufferExceeded")
    }

    if (track && happyTx.nonceValue - track.nextNonce > BigInt(manager.bufferLimit))
        throw new Error("Nonce out of range")

    return new Promise<ReturnType<typeof manager.processor>>((resolve, reject) => {
        const buffer: HappyTxBuffer = {
            happyTx: happyTx,
            resolve: (value) => {
                manager.totalSize--
                resolve(value as ReturnType<typeof manager.processor>)
            },
            reject: (reason?: unknown) => {
                manager.totalSize--
                reject(reason)
            },
        }

        manager.totalSize = addBuffer(manager.tracks, key, happyTx.nonceValue, buffer, manager.totalSize)

        if (!track || !track.running) {
            runNext(manager, key)
        }
    })
}

/**
 * Initializes a track for a given key. Looks up onchain nonce using address & nonceTrack.
 */
async function initializeTrack(manager: NonceQueueManager, key: string, happyTx: Bufferable): Promise<NonceTrack> {
    const fetchPromise =
        manager.nonceFetchPromises.get(key) ??
        manager.fetchNonce(happyTx).then((initialNonce) => {
            const newTrack: NonceTrack = {
                queue: new Map(),
                running: false,
                nextNonce: initialNonce,
                activeBuffer: null,
            }

            setTrack(manager.tracks, key, newTrack)
            manager.nonceFetchPromises.delete(key)
            return newTrack
        })
    manager.nonceFetchPromises.set(key, fetchPromise)

    return fetchPromise
}

/**
 * Processes the next buffer in a track's queue.
 */
async function runNext<T extends Processor>(manager: NonceQueueManager<T>, key: string): Promise<void> {
    const track = getTrack(manager.tracks, key)!

    if (track.queue.size === 0) {
        track.running = false
        return
    }

    while (true) {
        const buffer = getNextBuffer(manager.tracks, key)
        if (!buffer) break

        if (!track.running) track.nextNonce = await manager.fetchNonce(buffer.happyTx)
        track.running = true

        try {
            const result = await manager.processor(buffer.happyTx)
            buffer.resolve(result)
        } catch (error) {
            buffer.reject(error)
        }
        clearActiveBuffer(manager.tracks, key)
    }

    track.running = false
}
