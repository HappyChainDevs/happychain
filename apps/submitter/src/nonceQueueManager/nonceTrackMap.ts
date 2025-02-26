import { ValidationFailedError } from "#src/errors"
import type { HappyTxBuffer, NonceTrackMap as INonceTrackMap, NonceTrack, NonceTrackKey } from "./types"

export class NonceTrackMap implements INonceTrackMap {
    private tracks: Map<NonceTrackKey, NonceTrack>

    constructor() {
        this.tracks = new Map<NonceTrackKey, NonceTrack>()
    }

    get(key: NonceTrackKey): NonceTrack | undefined {
        return this.tracks.get(key)
    }

    set(key: NonceTrackKey, track: NonceTrack): void {
        this.tracks.set(key, track)
    }

    entries(): IterableIterator<[string, NonceTrack]> {
        return this.tracks.entries()
    }

    addBuffer(key: NonceTrackKey, nonceValue: bigint, buffer: HappyTxBuffer, initialTotalSize: number): number {
        let totalSize = initialTotalSize

        if (!this.tracks.has(key)) throw new Error(`Track not found for key: ${key}`)

        const track = this.tracks.get(key)!

        if (nonceValue < track.nextNonce) throw new ValidationFailedError(undefined, "0x756688fe")

        const existingBuffer = track.queue.get(nonceValue)
        if (existingBuffer) {
            existingBuffer.reject(new Error("Buffer replaced by a new one"))
            totalSize--
        }

        track.queue.set(nonceValue, buffer)
        totalSize++
        return totalSize
    }

    getNextBuffer(key: NonceTrackKey): HappyTxBuffer | null {
        const track = this.tracks.get(key)

        if (track?.queue.has(track.nextNonce)) {
            const buffer = track.queue.get(track.nextNonce)!
            track.queue.delete(track.nextNonce)
            track.activeBuffer = buffer
            return buffer
        }
        return null
    }

    markActiveBufferSubmitted(key: NonceTrackKey): void {
        const track = this.tracks.get(key)
        if (track) {
            track.activeBuffer = null
            track.nextNonce++
        }
    }

    pruneMostActiveTrack(totalSize: number): { prunedBuffers: HappyTxBuffer[]; newTotalSize: number } {
        let newTotalSize = totalSize
        let maxQueueSize = 0
        let maxKey: NonceTrackKey | null = null
        for (const [trackKey, track] of this.tracks.entries()) {
            const queueSize = track.queue.size + (track.activeBuffer ? 1 : 0)
            if (queueSize > maxQueueSize) {
                maxQueueSize = queueSize
                maxKey = trackKey
            }
        }

        const prunedBuffers: HappyTxBuffer[] = []
        if (maxKey) {
            const track = this.tracks.get(maxKey)!
            for (const buffer of track.queue.values()) {
                buffer.reject(new Error("bufferPrunedDueToCapacityLimit"))
                prunedBuffers.push(buffer)
            }
            newTotalSize -= track.queue.size
            track.queue.clear()
            if (!track.activeBuffer) {
                this.tracks.delete(maxKey)
            }
        }

        return { prunedBuffers, newTotalSize }
    }
}
