import { FibonacciHeap, type INode } from "@tyriar/fibonacci-heap"
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
    totalSize: number
    fetchNonce: NonceRetriever
    nonceFetchPromises: Map<string, Promise<NonceTrack>>
    private fibonacciHeap: FibonacciHeap<number, NonceTrackKey>
    private nodeMap: Map<NonceTrackKey, INode<number, NonceTrackKey>>
    readonly bufferLimit: number
    readonly maxCapacity: number

    constructor(bufferLimit: number, maxCapacity: number, processor: TProcessor, fetchNonce: NonceRetriever) {
        this.tracks = new NonceTrackMap()
        this.fibonacciHeap = new FibonacciHeap()
        this.nodeMap = new Map()
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
        const track = (oldTrack?.running && oldTrack) || (await this.initializeTrack(key))

        if (this.totalSize >= this.maxCapacity) {
            const maxNode = this.fibonacciHeap.extractMinimum()

            const maxKey = maxNode?.value
            if (maxKey) {
                this.nodeMap.delete(key)
                const { newTotalSize } = this.tracks.pruneMostActiveTrack(this.totalSize, maxKey)
                this.totalSize = newTotalSize
            }
        }

        const queueSize = track.queue.size + (track.activeBuffer ? 1 : 0)
        if (queueSize >= this.bufferLimit) throw new Error("bufferExceeded")

        if (happyTx.nonceValue - track.nextNonce > BigInt(this.bufferLimit)) {
            if (!track.activeBuffer && !track.queue.size) this.tracks.remove(key)
            throw new Error("Nonce out of range")
        }

        return new Promise<TProcessorResult>((resolve, reject) => {
            const buffer: HappyTxBuffer = {
                happyTx: happyTx,
                resolve: (value) => {
                    this.totalSize--
                    resolve(value as TProcessorResult)
                },
                reject: (reason) => {
                    this.totalSize--
                    reject(reason)
                },
            }

            this.totalSize = this.tracks.addBuffer(key, happyTx.nonceValue, buffer, this.totalSize)

            const node = this.nodeMap.get(key)

            if (node) {
                // @tyriar/fibonacci-heap doesn't implement increaseKey so instead
                // we will delete the previous and insert a new node
                this.fibonacciHeap.delete(node)
            }

            const newNode = this.fibonacciHeap.insert(track.queue.size, key)
            this.nodeMap.set(key, newNode)

            if (!track.running) {
                track.running = true
                this.runNext(key)
            }
        })
    }

    private async initializeTrack(key: NonceTrackKey): Promise<NonceTrack> {
        const fetchPromise =
            this.nonceFetchPromises.get(key) ??
            new Promise((resolve) => {
                const newTrack: NonceTrack = {
                    queue: new Map(),
                    running: false,
                    nextNonce: 0n, // initialize track with 0n, will lookup if/when needed
                    activeBuffer: null,
                }

                this.tracks.set(key, newTrack)
                this.nonceFetchPromises.delete(key)
                resolve(newTrack)
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

            // if nonce is 0n, we can assume its the first tx for this user-track
            // this is true for new users with zero history, as well as old users
            // with no history in-memory
            if (!track.nextNonce) track.nextNonce = await this.fetchNonce(buffer.happyTx)

            try {
                const result = await this.processor(buffer.happyTx)
                buffer.resolve(result)
            } catch (error) {
                buffer.reject(error)
            }

            const node = this.nodeMap.get(key)
            if (!node) throw new Error("Unexpected state - missing tx info") // ?????? shouldn't happen, but lets not throw an error and break things

            // Update the size of the queue in the heap after processing a job
            if (track.queue.size === 0) {
                this.fibonacciHeap.delete(node)
                this.tracks.remove(key)
                this.nodeMap.delete(key)
            } else {
                // Update the size of the queue in the heap
                this.fibonacciHeap.decreaseKey(node, track.queue.size)
            }
            this.tracks.markActiveBufferSubmitted(key)
        }

        track.running = false
    }
}
