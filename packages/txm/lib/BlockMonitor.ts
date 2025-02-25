import { LogTag, Logger } from "@happy.tech/common"
import type { Block } from "viem"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionManager } from "./TransactionManager.js"
/**
 * A type alias for {@link Block} with the `blockTag` set to `"latest"`, ensuring type definitions correspond to the latest block.
 */
export type LatestBlock = Block<bigint, false, "latest">

/**
 * This module is responsible for emitting the {@link Topics.NewBlock} event when a new block is received,
 * notifying other parts of the code that a new block has just occurred. Along with the notification,
 * it sends the latest block information with the event, allowing other parts of the application to use this data for their own purposes.
 */
export class BlockMonitor {
    private txmgr: TransactionManager
    private unwatch: (() => void) | undefined
    private blockTimeout: ReturnType<typeof setTimeout> | undefined

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager
    }

    async start() {
        this.scheduleTimeout()
        this.unwatch = this.txmgr.viemClient.watchBlocks({
            onBlock: this.onNewBlock.bind(this),
            ...(this.txmgr.transportProtocol === "http" ? { pollingInterval: this.txmgr.pollingInterval } : {}),
            onError: (error) => {
                Logger.instance.error(LogTag.TXM, "Error watching blocks", error)
                this.resetBlockSubscription()
            },
        })
    }

    private onNewBlock(block: LatestBlock) {
        if (this.blockTimeout) clearTimeout(this.blockTimeout)
        eventBus.emit(Topics.NewBlock, block)
        this.scheduleTimeout()
    }

    private scheduleTimeout() {
        this.blockTimeout = setTimeout(() => {
            Logger.instance.warn(LogTag.TXM, "Timeout reached. Resetting block subscription.")
            this.resetBlockSubscription()
        }, this.txmgr.blockInactivityTimeout)
    }

    private resetBlockSubscription() {
        if (this.unwatch) {
            this.unwatch()
        }
        this.start()
    }
}
