import type { LatestBlock } from "./BlockMonitor"
import { Topics, eventBus } from "./EventBus.js"
import type { Transaction } from "./Transaction.js"
import type { AttemptSubmissionErrorCause } from "./TransactionSubmitter"
import { TraceMethod } from "./telemetry/traces"

// TODO
//
// TransactionSubmissionFailed is weird: it only triggers when the first attempt fails to submit in the Tx, but the
// TxMonitor will still make further attempts (whose failure are not reported via hooks).
//
// TransactionSaveFailed has the same quirk, but there it makes sense as failing to save the transaction at the
// collection stage means there won't be any further attempts, whereas further failures are not really user-relevant.
// This is only used in tests, and probably this shouldn't be a user-exposed hook.

export enum TxmHookType {
    All = "All",
    TransactionStatusChanged = "TransactionStatusChanged",
    TransactionSaveFailed = "TransactionSaveFailed",
    NewBlock = "NewBlock",
    TransactionSubmissionFailed = "TransactionSubmissionFailed",
    RpcIsDown = "RpcIsDown",
    RpcIsUp = "RpcIsUp",
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

export type TxmRpcIsDownHookPayload = {
    type: TxmHookType.RpcIsDown
}

export type TxmRpcIsUpHookPayload = {
    type: TxmHookType.RpcIsUp
}

export type TxmHookPayload =
    | TxmTransactionStatusChangedHookPayload
    | TxmNewBlockHookPayload
    | TxmTransactionSaveFailedHookPayload
    | TxmTransactionSubmissionFailedHookPayload
    | TxmRpcIsDownHookPayload
    | TxmRpcIsUpHookPayload

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
    [TxmHookType.RpcIsDown]: (() => void)[]
    [TxmHookType.RpcIsUp]: (() => void)[]
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
            [TxmHookType.RpcIsDown]: [],
            [TxmHookType.RpcIsUp]: [],
        }
        eventBus.on(Topics.TransactionStatusChanged, this.onTransactionStatusChanged.bind(this))
        eventBus.on(Topics.TransactionSaveFailed, this.onTransactionSaveFailed.bind(this))
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
        eventBus.on(Topics.TransactionSubmissionFailed, this.onTransactionSubmissionFailed.bind(this))
        eventBus.on(Topics.RpcIsDown, this.onRpcIsDown.bind(this))
        eventBus.on(Topics.RpcIsUp, this.onRpcIsUp.bind(this))
    }

    public addHook<T extends TxmHookType>(type: T, handler: TxmHookHandler<T>): () => void {
        if (!this.hooks[type]) {
            this.hooks[type] = []
        }
        this.hooks[type].push(handler)

        return () => {
            const index = this.hooks[type].indexOf(handler)
            if (index !== -1) {
                this.hooks[type].splice(index, 1)
            }
        }
    }

    @TraceMethod("txm.hook-manager.on-transaction-status-changed")
    private async onTransactionStatusChanged(payload: { transaction: Transaction }): Promise<void> {
        this.hooks[TxmHookType.TransactionStatusChanged].forEach((handler) => handler(payload.transaction))

        this.hooks[TxmHookType.All].forEach((handler) =>
            handler({
                type: TxmHookType.TransactionStatusChanged,
                transaction: payload.transaction,
            }),
        )
    }

    @TraceMethod("txm.hook-manager.on-transaction-save-failed")
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

    @TraceMethod("txm.hook-manager.on-new-block")
    private async onNewBlock(block: LatestBlock): Promise<void> {
        this.hooks[TxmHookType.NewBlock].forEach((handler) => handler(block))

        this.hooks[TxmHookType.All].forEach((handler) =>
            handler({
                type: TxmHookType.NewBlock,
                block,
            }),
        )
    }

    @TraceMethod("txm.hook-manager.on-transaction-submission-failed")
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

    @TraceMethod("txm.hook-manager.on-rpc-is-down")
    private async onRpcIsDown(): Promise<void> {
        this.hooks[TxmHookType.RpcIsDown].forEach((handler) => handler())

        this.hooks[TxmHookType.All].forEach((handler) => handler({ type: TxmHookType.RpcIsDown }))
    }

    @TraceMethod("txm.hook-manager.on-rpc-is-up")
    private async onRpcIsUp(): Promise<void> {
        this.hooks[TxmHookType.RpcIsUp].forEach((handler) => handler())

        this.hooks[TxmHookType.All].forEach((handler) => handler({ type: TxmHookType.RpcIsUp }))
    }
}
