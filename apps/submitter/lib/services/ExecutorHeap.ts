import { type Address, IndexedHeap } from "@happy.tech/common"
import type { Account } from "viem/accounts"
import { blockExecutorJobCountGauge } from "#lib/telemetry/metrics.ts"
import { TraceMethod } from "#lib/telemetry/traces"

interface Executor {
    account: Account
    jobCount: number
}

/**
 * MinHeap to track Executors by job count.
 * The executor with the least job count is at the top of the heap and can be accessed with .peek()
 */
export class ExecutorHeap extends IndexedHeap<Executor> {
    constructor() {
        super(
            (a, b) => a.jobCount < b.jobCount,
            (e) => e.account.address,
        )
    }

    /** Adds a new executor to the heap. */
    @TraceMethod("ExecutorHeap.addAccount")
    public addAccount(account: Account): void {
        super.add({ account, jobCount: 0 })
        blockExecutorJobCountGauge.record(0, { account: account.address })
    }

    /** Increments job count for an executor. */
    @TraceMethod("ExecutorHeap.increment")
    public increment(address: Address): boolean {
        return this.update(address, (e) => {
            e.jobCount++
            blockExecutorJobCountGauge.record(e.jobCount, { account: address })
        })
    }

    /** Decrements job count for an executor. */
    @TraceMethod("ExecutorHeap.decrement")
    public decrement(address: Address): boolean {
        return this.update(address, (e) => {
            e.jobCount--
            blockExecutorJobCountGauge.record(e.jobCount, { account: address })
        })
    }

    /** Returns the executor with the lowest job count. */
    @TraceMethod("ExecutorHeap.peek")
    public override peek(): Executor {
        return super.peek()!
    }
}
