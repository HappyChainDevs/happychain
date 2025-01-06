import { Topics, eventBus } from "./EventBus.js"
import type { Transaction } from "./Transaction.js"

export enum TxmHookType {
    All = "All",
    TransactionStatusChanged = "TransactionStatusChanged",
}

export type TxmHookPayload = {
    type: TxmHookType
    transaction: Transaction
}

export type TxmHookHandler = (event: TxmHookPayload) => void

/**
 * This module manages the hooks system. A hook in the transaction manager is a callback function that
 * executes when specific events occur, such as when a transaction's status changes.
 * This allows the library consumer to receive notifications about events and respond accordingly.
 * To add a hook, call the {@link TransactionManager.addHook} function.
 *
 * This method accepts two parameters:
 * - The hook type you want to subscribe to (optional)
 * - The callback function that executes when the event occurs.
 */
export class HookManager {
    private hooks: Record<TxmHookType, TxmHookHandler[]>

    constructor() {
        this.hooks = {
            [TxmHookType.All]: [],
            [TxmHookType.TransactionStatusChanged]: [],
        }
        eventBus.on(Topics.TransactionStatusChanged, this.onTransactionStatusChanged.bind(this))
    }

    public async addHook(handler: TxmHookHandler, type: TxmHookType): Promise<void> {
        if (!this.hooks[type]) {
            this.hooks[type] = []
        }
        this.hooks[type].push(handler)
    }

    private async onTransactionStatusChanged(payload: {
        transaction: Transaction
    }): Promise<void> {
        this.hooks[TxmHookType.TransactionStatusChanged].concat(this.hooks[TxmHookType.All]).map((h) =>
            h({
                type: TxmHookType.TransactionStatusChanged,
                transaction: payload.transaction,
            }),
        )
    }
}
