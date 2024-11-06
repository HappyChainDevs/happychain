import type { UUID } from "@happychain/common"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionStatus } from "./Transaction.js"

export enum TxmHookType {
    All = "All",
    TransactionStatusChanged = "TransactionStatusChanged",
}

export type TxmHookPayload = {
    type: TxmHookType
    intentId: UUID
}

export type TxmHookHandler = (event: TxmHookPayload) => void

export class HookManager {
    private hooks: Record<TxmHookType, TxmHookHandler[]>

    constructor() {
        this.hooks = {
            [TxmHookType.All]: [],
            [TxmHookType.TransactionStatusChanged]: [],
        }
        eventBus.on(Topics.TransactionStatusChanged, this.onTransactionStatusChanged.bind(this))
    }

    public async addHook(type: TxmHookType, handler: TxmHookHandler): Promise<void> {
        if (!this.hooks[type]) {
            this.hooks[type] = []
        }
        this.hooks[type].push(handler)
    }

    private async onTransactionStatusChanged(payload: {
        intentId: UUID
        status: TransactionStatus
    }): Promise<void> {
        this.hooks[TxmHookType.TransactionStatusChanged].map((h) =>
            h({
                type: TxmHookType.TransactionStatusChanged,
                intentId: payload.intentId,
            }),
        )

        this.hooks[TxmHookType.All].map((h) =>
            h({
                type: TxmHookType.All,
                intentId: payload.intentId,
            }),
        )
    }
}
