import { ValidationFailedError } from "../errors"
import type { HappyTxBuffer, NonceTrack, NonceTrackMap } from "./types"

export function createNonceTrackMap(): NonceTrackMap {
    return new Map<string, NonceTrack>()
}

export function getTrack(tracks: NonceTrackMap, key: string): NonceTrack | undefined {
    return tracks.get(key)
}

export function setTrack(tracks: NonceTrackMap, key: string, track: NonceTrack): void {
    tracks.set(key, track)
}

export function removeTrack(tracks: NonceTrackMap, key: string): void {
    tracks.delete(key)
}

export function hasTrack(tracks: NonceTrackMap, key: string) {
    return tracks.has(key)
}

export function initializeTrack(tracks: NonceTrackMap, key: string, nonce: bigint) {
    if (tracks.has(key)) return
    tracks.set(key, { queue: new Map(), running: false, nextNonce: nonce, activeBuffer: null })
}

export function addBuffer(
    tracks: NonceTrackMap,
    key: string,
    nonceValue: bigint,
    buffer: HappyTxBuffer,
    initialTotalSize: number,
): number {
    let totalSize = initialTotalSize

    if (!tracks.has(key)) throw new Error(`Track not found for key: ${key}`)

    const track = tracks.get(key)!

    // TODO: fake the revert error, feels bad, should be better
    if (nonceValue < track.nextNonce) throw new ValidationFailedError(undefined, "0x756688fe")

    const existingBuffer = track.queue.get(nonceValue)
    if (existingBuffer) {
        // Cancel the previously submitted
        // TODO: validation first? i.e. check if new one has higher submitterFee
        existingBuffer.reject(new Error("Buffer replaced by a new one"))
        totalSize--
    }

    track.queue.set(nonceValue, buffer)
    totalSize++
    return totalSize
}

export function getNextBuffer(tracks: NonceTrackMap, key: string): HappyTxBuffer | null {
    const track = tracks.get(key)

    if (track?.queue.has(track.nextNonce)) {
        const buffer = track.queue.get(track.nextNonce)!
        track.queue.delete(track.nextNonce)
        track.activeBuffer = buffer
        return buffer
    }
    return null
}

export function clearActiveBuffer(tracks: NonceTrackMap, key: string): void {
    const track = tracks.get(key)
    if (track) {
        track.activeBuffer = null
        track.nextNonce++
    }
}

export function pruneMostActiveTrack(
    tracks: NonceTrackMap,
    totalSize: number,
): { prunedBuffers: HappyTxBuffer[]; newTotalSize: number } {
    let newTotalSize = totalSize
    let maxQueueSize = 0
    let maxKey = ""
    for (const [trackKey, track] of tracks.entries()) {
        const queueSize = track.queue.size + (track.activeBuffer ? 1 : 0)
        if (queueSize > maxQueueSize) {
            maxQueueSize = queueSize
            maxKey = trackKey
        }
    }

    const prunedBuffers: HappyTxBuffer[] = []
    if (maxKey) {
        const track = tracks.get(maxKey)!
        for (const buffer of track.queue.values()) {
            buffer.reject(new Error("bufferPrunedDueToCapacityLimit"))
            prunedBuffers.push(buffer)
        }
        newTotalSize -= track.queue.size
        track.queue.clear()
        if (!track.activeBuffer) {
            tracks.delete(maxKey)
        }
    }

    return { prunedBuffers, newTotalSize }
}
