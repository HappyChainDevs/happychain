import { bigIntReplacer, bigIntReviver, bigIntToZeroPadded, createUUID } from "@happy.tech/common"
import type { Address, Hex, UUID } from "@happy.tech/common"
import { context, trace } from "@opentelemetry/api"
import type { Insertable, Selectable } from "kysely"
import { type Result, err, ok } from "neverthrow"
import { type ContractFunctionArgs, type Hash, encodeFunctionData } from "viem"
import type { ABIManager } from "./AbiManager"
import type { LatestBlock } from "./BlockMonitor"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionTable } from "./db/types.js"
import { TxmMetrics } from "./telemetry/metrics"
import { TraceMethod } from "./telemetry/traces"

export enum TransactionStatus {
    /**
     * Default state for new transaction: we're awaiting submission of the first attempt for the transaction.
     */
    NotAttempted = "NotAttempted",
    /**
     * At least one attempt to submit the transaction has been made — it might have hit the mempool and waiting for
     * inclusion in a block, or it might have failed before that.
     */
    Pending = "Pending",
    /**
     * The transaction has been included in a block but its execution reverted.
     */
    Failed = "Failed",
    /**
     * The transaction has expired. This indicates that the deadline has passed without the transaction being included in a block.
     */
    Expired = "Expired",
    /**
     * The transaction has expired and we are trying to cancel it to save gas
     */
    Cancelling = "Cancelling",
    /**
     * The transaction has expired, and we cancelled it to save gas, preventing it from being included on-chain and potentially reverting or executing actions that are no longer relevant.
     */
    Cancelled = "Cancelled",
    /**
     * The transaction's inclusion was interrupted because an external transaction using the same nonce was processed.
     * To retry including this transaction, it must be resubmitted by a {@link TransactionOriginator}.
     */
    Interrupted = "Interrupted",
    /**
     * The transaction has been included onchain and its execution was successful.
     */
    Success = "Success",
}

export enum AttemptType {
    Cancellation = "Cancellation",
    Original = "Original",
}

export interface Attempt {
    type: AttemptType
    hash: Hash
    nonce: number
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    gas: bigint
}

export enum TransactionCallDataFormat {
    Raw = "Raw",
    Function = "Function",
}

export const NotFinalizedStatuses = [
    TransactionStatus.NotAttempted,
    TransactionStatus.Pending,
    TransactionStatus.Cancelling,
]

interface TransactionConstructorBaseConfig {
    /**
     * The address of the contract that will be called
     */
    address: Address
    /**
     * The value of the transaction in wei
     * Defaults to 0n
     */
    value?: bigint
    /**
     * The deadline of the transaction in seconds (optional)
     * This is used to try to cancel the transaction if it is not included in a block after the deadline to save gas
     */
    deadline?: number
    /**
     * Additional metadata for the transaction that can be used by your custom GasEstimator
     */
    metadata?: Record<string, unknown>
}

type TransactionConstructorCalldataConfig = TransactionConstructorBaseConfig & {
    calldata: Hex
    functionName?: string
    contractName?: string
    args?: ContractFunctionArgs
}

type TransactionConstructorFunctionConfig = TransactionConstructorBaseConfig & {
    functionName: string
    contractName: string
    args: ContractFunctionArgs
}

export type TransactionConstructorConfig = TransactionConstructorCalldataConfig | TransactionConstructorFunctionConfig

export class Transaction {
    readonly intentId: UUID

    readonly from: Address

    readonly chainId: number

    readonly address: Address

    readonly functionName?: string

    readonly args?: ContractFunctionArgs

    // This doesn't need to match the Solidity contract name but must match the contract alias of one of the contracts that you have provided when initializing the transaction manager with the ABI Manager
    readonly contractName?: string

    readonly calldata: Hex

    readonly value: bigint

    readonly deadline: number | undefined

    status: TransactionStatus

    readonly attempts: Attempt[]

    // Marks a transaction as older than one block so as avoid monitoring them at the same time we submit the transaction for the first time.
    // It can be undefined because we save transactions before they are submitted, so there is a small time lapse where the transaction is saved but not yet submitted
    collectionBlock: bigint | undefined

    // Whether the transaction has been updated and needs to be flushed to the database.
    // This field is not persisted in the database.
    pendingFlush: boolean

    // This is true if the transaction has never been persisted to the database yet.
    // This field is not persisted in the database.
    notPersisted: boolean

    createdAt: Date

    updatedAt: Date

    /**
     * Stores additional information for the transaction.
     * Enables originators to provide extra details, such as gas limits, which can be leveraged by customizable services.
     */
    readonly metadata: Record<string, unknown>

    /**
     * Stores callback functions for each transaction status.
     * These callbacks are triggered when the transaction status changes.
     */
    private callbacks: Record<TransactionStatus, ((transaction: Transaction) => void)[]>

    /**
     * Stores promises that wait for the transaction to be finalized.
     * These promises are resolved when the transaction status changes to a finalized state.
     */
    private finalizedPromiseResolvers: ((transaction: Result<Transaction, Error>) => void)[]

    constructor(
        config: TransactionConstructorConfig & {
            intentId?: UUID
            from: Address
            chainId: number
            status?: TransactionStatus
            attempts?: Attempt[]
            collectionBlock?: bigint
            createdAt?: Date
            updatedAt?: Date
            pendingFlush?: boolean
            notPersisted?: boolean
        },
        abiManager: ABIManager,
    ) {
        this.intentId = config.intentId ?? createUUID()
        this.from = config.from
        this.chainId = config.chainId
        this.address = config.address
        this.value = config.value ?? 0n
        this.deadline = config.deadline
        this.status = config.status ?? TransactionStatus.NotAttempted
        this.attempts = config.attempts ?? []
        this.collectionBlock = config.collectionBlock
        this.createdAt = config.createdAt ?? new Date()
        this.updatedAt = config.updatedAt ?? new Date()
        this.metadata = config.metadata ?? {}
        this.pendingFlush = config.pendingFlush ?? true
        this.notPersisted = config.notPersisted ?? true

        if ("calldata" in config) {
            this.calldata = config.calldata
            this.functionName = config.functionName
            this.contractName = config.contractName
            this.args = config.args
        } else {
            const abi = abiManager.get(config.contractName)
            if (!abi) {
                throw new Error(`ABI not found for contract ${config.contractName}`)
            }
            this.calldata = encodeFunctionData({ abi, functionName: config.functionName, args: config.args })
            this.functionName = config.functionName
            this.contractName = config.contractName
            this.args = config.args
        }

        this.callbacks = {} as Record<TransactionStatus, ((transaction: Transaction) => void)[]>
        Object.values(TransactionStatus).forEach((status) => {
            this.callbacks[status] = []
        })

        this.finalizedPromiseResolvers = []
    }

    addAttempt(attempt: Attempt): void {
        this.attempts.push(attempt)
        this.markUpdated()
    }

    addCollectionBlock(blockNumber: bigint): void {
        this.collectionBlock = blockNumber
        this.markUpdated()
    }

    removeAttempt(hash: Hash): void {
        const index = this.attempts.findIndex((attempt) => attempt.hash === hash)
        if (index > -1) {
            this.attempts.splice(index, 1)
        }
        this.markUpdated()
    }

    getInAirAttempts(): Attempt[] {
        const biggestNonce = this.attempts.reduce((acc, attempt) => Math.max(acc, attempt.nonce), 0)

        return this.attempts.filter((attempt) => attempt.nonce >= biggestNonce)
    }

    isExpired(block: LatestBlock, blockTime: bigint): boolean {
        return this.deadline ? block.timestamp + blockTime > BigInt(this.deadline) : false
    }

    @TraceMethod("txm.transaction.change-status")
    changeStatus(status: TransactionStatus): void {
        const span = trace.getSpan(context.active())!

        span.addEvent("transaction.change-status", {
            transactionIntentId: this.intentId,
            status,
        })

        this.status = status
        this.markUpdated()

        TxmMetrics.getInstance().transactionStatusChangeCounter.add(1, {
            status: this.status,
        })

        if (!NotFinalizedStatuses.includes(status)) {
            TxmMetrics.getInstance().attemptsUntilFinalization.record(this.attempts.length)

            this.finalizedPromiseResolvers.forEach((resolve) => {
                resolve(ok(this))
            })

            this.finalizedPromiseResolvers = []
        }

        this.callbacks[status].forEach((callback) => {
            try {
                callback(this)
            } catch (error) {
                console.error(
                    `Error in callback for transaction ${this.intentId} when status changed to ${status}:`,
                    error,
                )
            }
        })

        eventBus.emit(Topics.TransactionStatusChanged, {
            transaction: this,
        })
    }

    on(status: TransactionStatus, callback: (transaction: Transaction) => void): void {
        this.callbacks[status].push(callback)
    }

    waitForFinalization(timeoutMs?: number): Promise<Result<Transaction, Error>> {
        return new Promise((resolve) => {
            this.finalizedPromiseResolvers.push(resolve)

            if (timeoutMs) {
                setTimeout(() => {
                    this.finalizedPromiseResolvers = this.finalizedPromiseResolvers.filter((p) => p !== resolve)

                    resolve(err(new Error(`Transaction finalization timed out after ${timeoutMs}ms`)))
                }, timeoutMs)
            }
        })
    }

    get attemptCount(): number {
        return this.attempts.length
    }

    get lastAttempt(): Attempt | undefined {
        return this.attempts[this.attempts.length - 1]
    }

    markFlushed(): void {
        this.pendingFlush = false

        if (this.notPersisted) {
            this.notPersisted = false
        }
    }

    private markUpdated(): void {
        this.updatedAt = new Date()

        if (this.pendingFlush === false) {
            this.pendingFlush = true
        }
    }

    toDbRow(): Insertable<TransactionTable> {
        return {
            intentId: this.intentId,
            from: this.from,
            chainId: this.chainId,
            address: this.address,
            functionName: this.functionName,
            contractName: this.contractName,
            value: bigIntToZeroPadded(this.value), // We convert the bigint value to a zero-padded string because 'value' can exceed the numeric limits of Number
            calldata: this.calldata,
            args: this.args ? JSON.stringify(this.args, bigIntReplacer) : undefined,
            deadline: this.deadline,
            collectionBlock: this.collectionBlock ? Number(this.collectionBlock) : undefined,
            status: this.status,
            attempts: JSON.stringify(this.attempts, bigIntReplacer),
            metadata: this.metadata ? JSON.stringify(this.metadata, bigIntReplacer) : undefined,
            createdAt: this.createdAt.getTime(),
            updatedAt: this.updatedAt.getTime(),
        }
    }

    static fromDbRow(row: Selectable<TransactionTable>, abiManager: ABIManager): Transaction {
        return new Transaction(
            {
                ...row,
                value: BigInt(row.value),
                args: row.args ? JSON.parse(row.args, bigIntReviver) : undefined,
                attempts: JSON.parse(row.attempts, bigIntReviver),
                collectionBlock: row.collectionBlock ? BigInt(row.collectionBlock) : undefined,
                metadata: row.metadata ? JSON.parse(row.metadata, bigIntReviver) : undefined,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
                notPersisted: false,
                pendingFlush: false,
            },
            abiManager,
        )
    }

    toJson(): string {
        return JSON.stringify(this, bigIntReplacer)
    }
}
