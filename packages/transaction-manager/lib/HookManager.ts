import { Topics, eventBus } from "./EventBus.js"
import type { Transaction } from "./Transaction.js"

export enum TxmHookType {
    TransactionStatusChanged = "TransactionStatusChanged",
}

export type TxmHookPayload = {
    type: TxmHookType
    transaction: Transaction
}

export type TxmHookHandler = (event: TxmHookPayload) => void

export class HookManager {
    private hooks: Record<TxmHookType | "All", TxmHookHandler[]>

    constructor() {
        this.hooks = {
            All: [],
            TransactionStatusChanged: [],
        }
        eventBus.on(Topics.TransactionStatusChanged, this.onTransactionStatusChanged.bind(this))
    }

    /**
     * Adds a hook to the hook manager.
     * @param type - The type of hook to add. Defaults to All.
     * @param handler - The handler function to add.
     */
    public async addHook({ type, handler }: { type?: TxmHookType; handler: TxmHookHandler }): Promise<void> {
        const mapKey = type ?? "All"

        if (!this.hooks[mapKey]) {
            this.hooks[mapKey] = []
        }
        this.hooks[mapKey].push(handler)
    }

    private async onTransactionStatusChanged(payload: {
        transaction: Transaction
    }): Promise<void> {
        this.hooks[TxmHookType.TransactionStatusChanged].concat(this.hooks.All).map((h) =>
            h({
                type: TxmHookType.TransactionStatusChanged,
                transaction: payload.transaction,
            }),
        )
    }
}
