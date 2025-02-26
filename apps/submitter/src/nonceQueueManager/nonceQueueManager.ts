import { NonceTrackMap } from "./nonceTrackMap"
import type {
    Bufferable,
    HappyTxBuffer,
    NonceRetriever,
    NonceTrack,
    NonceTrackKey,
    Processor,
    ProcessorResult,
} from "./types"

export class NonceQueueManager<TProcessor extends Processor, TProcessorResult extends ProcessorResult<TProcessor>> {
    tracks: NonceTrackMap
    processor: TProcessor
    readonly bufferLimit: number
    readonly maxCapacity: number
    totalSize: number
    fetchNonce: NonceRetriever
    nonceFetchPromises: Map<string, Promise<NonceTrack>>

    constructor(bufferLimit: number, maxCapacity: number, processor: TProcessor, fetchNonce: NonceRetriever) {
        this.tracks = new NonceTrackMap()
        this.processor = processor
        this.fetchNonce = fetchNonce
        this.bufferLimit = bufferLimit
        this.maxCapacity = maxCapacity
        this.totalSize = 0
        this.nonceFetchPromises = new Map()
    }

    async enqueueBuffer<THappyBuffer extends Bufferable>(happyTx: THappyBuffer): Promise<TProcessorResult> {
        const key = `${happyTx.account}-${happyTx.nonceTrack}` as const
        const oldTrack = this.tracks.get(key)
        const track = (oldTrack?.running && oldTrack) || (await this.initializeTrack(key, happyTx))

        if (this.totalSize >= this.maxCapacity) {
            const { newTotalSize } = this.tracks.pruneMostActiveTrack(this.totalSize)
            this.totalSize = newTotalSize
        }

        const queueSize = track.queue.size + (track.activeBuffer ? 1 : 0)
        if (queueSize >= this.bufferLimit) {
            throw new Error("bufferExceeded")
        }

        if (happyTx.nonceValue - track.nextNonce > BigInt(this.bufferLimit)) {
            throw new Error("Nonce out of range")
        }

        return new Promise<TProcessorResult>((resolve, reject) => {
            const buffer: HappyTxBuffer = {
                happyTx: happyTx,
                resolve: (value) => {
                    this.totalSize--
                    resolve(value as TProcessorResult)
                },
                reject: (reason?: unknown) => {
                    this.totalSize--
                    reject(reason)
                },
            }

            this.totalSize = this.tracks.addBuffer(key, happyTx.nonceValue, buffer, this.totalSize)

            if (!track || !track.running) {
                this.runNext(key)
            }
        })
    }

    private async initializeTrack(key: NonceTrackKey, happyTx: Bufferable): Promise<NonceTrack> {
        const fetchPromise =
            this.nonceFetchPromises.get(key) ??
            this.fetchNonce(happyTx).then((initialNonce) => {
                const newTrack: NonceTrack = {
                    queue: new Map(),
                    running: false,
                    nextNonce: initialNonce,
                    activeBuffer: null,
                }

                this.tracks.set(key, newTrack)
                this.nonceFetchPromises.delete(key)
                return newTrack
            })
        this.nonceFetchPromises.set(key, fetchPromise)

        return fetchPromise
    }

    private async runNext(key: NonceTrackKey): Promise<void> {
        const track = this.tracks.get(key)!

        if (!track.queue.size) {
            track.running = false
            return
        }

        while (true) {
            const buffer = this.tracks.getNextBuffer(key)
            if (!buffer) break

            if (!track.running) track.nextNonce = await this.fetchNonce(buffer.happyTx)
            track.running = true

            try {
                const result = await this.processor(buffer.happyTx)
                buffer.resolve(result)
            } catch (error) {
                buffer.reject(error)
            }
            this.tracks.markActiveBufferSubmitted(key)
        }

        track.running = false
    }

    getUserBuffers(account: string): Bufferable[] {
        const userBuffers: Bufferable[] = []
        const userKeyPrefix = `${account}-`
        for (const [key, track] of this.tracks.entries()) {
            if (key.startsWith(userKeyPrefix)) {
                for (const buffer of track.queue.values()) {
                    userBuffers.push(buffer.happyTx)
                }
                if (track.activeBuffer) {
                    userBuffers.push(track.activeBuffer.happyTx)
                }
            }
        }
        return userBuffers
    }
}
