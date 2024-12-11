import type { LatestBlock } from "./BlockMonitor"
import { Topics, eventBus } from "./EventBus.js"
import type { Transaction } from "./Transaction.js"

export enum TxmHookType {
    All = "All",
    TransactionStatusChanged = "TransactionStatusChanged",
    NewBlock = "NewBlock",
}

export type TxmTransactionStatusChangedHookPayload = {
    type: TxmHookType.TransactionStatusChanged
    transaction: Transaction
}

export type TxmNewBlockHookPayload = {
    type: TxmHookType.NewBlock
    block: LatestBlock
}

export type TxmHookPayload = TxmTransactionStatusChangedHookPayload | TxmNewBlockHookPayload

export type TxmHookHandler<T extends TxmHookType = TxmHookType> = (
    event: Extract<TxmHookPayload, { type: T }> extends never ? TxmHookPayload : Extract<TxmHookPayload, { type: T }>,
) => void

/**
 * This module manages the hooks system. A hook in the transaction manager is a callback function that
 * executes when specific events occur, such as when a transaction's status changes.
 * This allows the originator to receive notifications about events and respond accordingly.
 * To add a hook, call the `addHook` function from the `TransactionManager` class.
 *
 * This method accepts two parameters:
 * - The hook type you want to subscribe to (optional)
 * - The callback function that executes when the event occurs.
 *
 * If you don't specify a hook type, the transaction manager will notify you about all event types.
 */
export class HookManager {
    private hooks: {
        [T in TxmHookType]: TxmHookHandler<T>[]
    }

    constructor() {
        this.hooks = {
            [TxmHookType.All]: [],
            [TxmHookType.TransactionStatusChanged]: [],
            [TxmHookType.NewBlock]: [],
        }
        eventBus.on(Topics.TransactionStatusChanged, this.onTransactionStatusChanged.bind(this))
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    public async addHook<T extends TxmHookType>(handler: TxmHookHandler<T>, type: T): Promise<void> {
        if (!this.hooks[type]) {
            this.hooks[type] = []
        }
        this.hooks[type].push(handler)
    }

    private async onTransactionStatusChanged(payload: { transaction: Transaction }): Promise<void> {
        ;[...this.hooks[TxmHookType.TransactionStatusChanged], ...this.hooks[TxmHookType.All]].forEach((h) =>
            h({
                type: TxmHookType.TransactionStatusChanged,
                transaction: payload.transaction,
            }),
        )
    }

    private async onNewBlock(block: LatestBlock): Promise<void> {
        ;[...this.hooks[TxmHookType.NewBlock], ...this.hooks[TxmHookType.All]].forEach((h) =>
            h({
                type: TxmHookType.NewBlock,
                block,
            }),
        )
    }
}
