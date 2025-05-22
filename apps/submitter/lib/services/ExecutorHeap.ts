import { type Address, IndexedHeap } from "@happy.tech/common"
import type { Account } from "viem/accounts"

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
    public addAccount(account: Account): void {
        super.add({ account, jobCount: 0 })
    }

    /** Increments job count for an executor. */
    public increment(address: Address): boolean {
        return this.update(address, (e) => {
            e.jobCount++
        })
    }

    /** Decrements job count for an executor. */
    public decrement(address: Address): boolean {
        return this.update(address, (e) => {
            e.jobCount--
        })
    }

    /** Returns the executor with the lowest job count. */
    public override peek(): Executor {
        return super.peek()!
    }
}
