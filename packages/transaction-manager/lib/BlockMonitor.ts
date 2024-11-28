import type { Block } from "viem"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionManager } from "./TransactionManager.js"

/**
 * A type alias for {@link Block} with the `blockTag` set to `"latest"`, ensuring type definitions correspond to the latest block.
 */
export type LatestBlock = Block<bigint, false, "latest">

/**
 * This module is responsible for emitting the NewBlock event when a new block is received,
 * notifying other parts of the code that a new block has just occurred. Along with the notification,
 * it sends the latest block information with the event, allowing other parts of the application to use this data for their own purposes.
 */
export class BlockMonitor {
    private txmgr: TransactionManager

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager

        this.txmgr.viemClient.watchBlocks({
            onBlock: this.onNewBlock.bind(this),
        })
    }

    private onNewBlock(block: LatestBlock) {
        eventBus.emit(Topics.NewBlock, block)
    }
}
