import type { LatestBlock } from "./BlockMonitor"
import { Topics, eventBus } from "./EventBus.js"
import type { Transaction } from "./Transaction.js"
import type { AttemptSubmissionErrorCause } from "./TransactionSubmitter"

export enum TxmHookType {
    All = "All",
    TransactionStatusChanged = "TransactionStatusChanged",
    TransactionSaveFailed = "TransactionSaveFailed",
    NewBlock = "NewBlock",
    TransactionSubmissionFailed = "TransactionSubmissionFailed",
}

export type TxmTransactionStatusChangedHookPayload = {
    type: TxmHookType.TransactionStatusChanged
    transaction: Transaction
}

export type TxmNewBlockHookPayload = {
    type: TxmHookType.NewBlock
    block: LatestBlock
}

export type TxmTransactionSaveFailedHookPayload = {
    type: TxmHookType.TransactionSaveFailed
    transaction: Transaction
}

export type TxmTransactionSubmissionFailedHookPayload = {
    type: TxmHookType.TransactionSubmissionFailed
    transaction: Transaction
    description: string
    cause: AttemptSubmissionErrorCause
}

export type TxmHookPayload =
    | TxmTransactionStatusChangedHookPayload
    | TxmNewBlockHookPayload
    | TxmTransactionSaveFailedHookPayload
    | TxmTransactionSubmissionFailedHookPayload

export type TxmHooksRecord = {
    [TxmHookType.All]: ((event: TxmHookPayload) => void)[]
    [TxmHookType.TransactionStatusChanged]: ((transaction: Transaction) => void)[]
    [TxmHookType.TransactionSaveFailed]: ((transaction: Transaction) => void)[]
    [TxmHookType.NewBlock]: ((block: LatestBlock) => void)[]
    [TxmHookType.TransactionSubmissionFailed]: ((
        transaction: Transaction,
        description: string,
        cause: AttemptSubmissionErrorCause,
    ) => void)[]
}

export type TxmHookHandler<T extends TxmHookType = TxmHookType.All> = TxmHooksRecord[T][number]
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
    private hooks: {
        [T in TxmHookType]: TxmHookHandler<T>[]
    }

    constructor() {
        this.hooks = {
            [TxmHookType.All]: [],
            [TxmHookType.TransactionStatusChanged]: [],
            [TxmHookType.TransactionSaveFailed]: [],
            [TxmHookType.NewBlock]: [],
            [TxmHookType.TransactionSubmissionFailed]: [],
        }
        eventBus.on(Topics.TransactionStatusChanged, this.onTransactionStatusChanged.bind(this))
        eventBus.on(Topics.TransactionSaveFailed, this.onTransactionSaveFailed.bind(this))
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
        eventBus.on(Topics.TransactionSubmissionFailed, this.onTransactionSubmissionFailed.bind(this))
    }

    public async addHook<T extends TxmHookType>(type: T, handler: TxmHookHandler<T>): Promise<void> {
        if (!this.hooks[type]) {
            this.hooks[type] = []
        }
        this.hooks[type].push(handler)
    }

    private async onTransactionStatusChanged(payload: { transaction: Transaction }): Promise<void> {
        this.hooks[TxmHookType.TransactionStatusChanged].forEach((handler) => handler(payload.transaction))

        this.hooks[TxmHookType.All].forEach((handler) =>
            handler({
                type: TxmHookType.TransactionStatusChanged,
                transaction: payload.transaction,
            }),
        )
    }

    private async onTransactionSaveFailed(payload: {
        transaction: Transaction
    }): Promise<void> {
        this.hooks[TxmHookType.TransactionSaveFailed].forEach((handler) => handler(payload.transaction))

        this.hooks[TxmHookType.All].forEach((handler) =>
            handler({
                type: TxmHookType.TransactionSaveFailed,
                transaction: payload.transaction,
            }),
        )
    }

    private async onNewBlock(block: LatestBlock): Promise<void> {
        this.hooks[TxmHookType.NewBlock].forEach((handler) => handler(block))

        this.hooks[TxmHookType.All].forEach((handler) =>
            handler({
                type: TxmHookType.NewBlock,
                block,
            }),
        )
    }

    private async onTransactionSubmissionFailed(payload: {
        transaction: Transaction
        description: string
        cause: AttemptSubmissionErrorCause
    }): Promise<void> {
        this.hooks[TxmHookType.TransactionSubmissionFailed].forEach((handler) =>
            handler(payload.transaction, payload.description, payload.cause),
        )

        this.hooks[TxmHookType.All].forEach((handler) =>
            handler({
                type: TxmHookType.TransactionSubmissionFailed,
                transaction: payload.transaction,
                description: payload.description,
                cause: payload.cause,
            }),
        )
    }
}
