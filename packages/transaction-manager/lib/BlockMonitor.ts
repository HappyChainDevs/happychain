import type { Block } from "viem"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionManager } from "./TransactionManager.js"

/**
 * A type alias for {@link Block} with the `blockTag` set to `"latest"`, ensuring type definitions correspond to the latest block.
 */
export type LatestBlock = Block<bigint, false, "latest">

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
