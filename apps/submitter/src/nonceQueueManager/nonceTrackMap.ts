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

    remove(key: NonceTrackKey): void {
        this.tracks.delete(key)
    }

    addBuffer(key: NonceTrackKey, nonceValue: bigint, buffer: HappyTxBuffer, initialTotalSize: number): number {
        if (!this.tracks.has(key)) throw new Error(`Track not found for key: ${key}`)

        const track = this.tracks.get(key)!

        if (nonceValue < track.nextNonce) throw new ValidationFailedError(undefined, "0x756688fe")

        const existingBuffer = track.queue.get(nonceValue)
        track.queue.set(nonceValue, buffer)

        if (existingBuffer) {
            existingBuffer.reject(new Error("Buffer replaced by a new one"))
            return initialTotalSize
        }

        return initialTotalSize + 1
    }

    getNextBuffer(key: NonceTrackKey): HappyTxBuffer | null {
        const track = this.tracks.get(key)
        if (track?.activeBuffer) throw new Error("never cleared previous active buffer")

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

    pruneMostActiveTrack(
        totalSize: number,
        maxKey: NonceTrackKey,
    ): { prunedBuffers: HappyTxBuffer[]; newTotalSize: number } {
        let newTotalSize = totalSize

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
