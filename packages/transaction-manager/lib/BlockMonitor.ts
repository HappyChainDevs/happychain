import type { Block } from "viem"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionManager } from "./transaction-manager/TransactionManager.js"
import type { ViemPublicClient } from "./transaction-manager/viemClients.js"

export class BlockMonitor {
    private txmgr: TransactionManager

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager

        this.txmgr.viemClient.watchBlocks({
            onBlock: this.onNewBlock.bind(this),
        })
    }

    private onNewBlock(block: Block) {
        eventBus.emit(Topics.NewBlock, block)
    }
}
