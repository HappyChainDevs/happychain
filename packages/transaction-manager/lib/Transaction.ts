import { type UUID, bigIntReplacer, bigIntReviver, createUUID } from "@happychain/common"
import type { Insertable, Selectable } from "kysely"
import type { Address, ContractFunctionArgs, Hash } from "viem"
import type { LatestBlock } from "./BlockMonitor"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionTable } from "./db/types.js"

export enum TransactionStatus {
    /**
     * Default state for new transaction: the transaction is awaiting processing by TXM or has been submitted in the mempool and is waiting to be included in a block.
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
     * The transaction has expired, and we are attempting to cancel it to save gas, preventing it from being included on-chain and potentially reverting or executing actions that are no longer relevant.
     */
    Cancelled = "Cancelled",
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

export const NotFinalizedStatuses = [TransactionStatus.Pending, TransactionStatus.Cancelling]

export interface TransactionConstructorConfig {
    /**
     * The address of the contract that will be called
     */
    address: Address
    /**
     * The function name of the contract that will be called
     */
    functionName: string
    /**
     * This doesn't need to match the Solidity contract name but must match the contract alias of one of the contracts
     * that you have provided when initializing the transaction manager with the ABI Manager
     */
    contractName: string
    /**
     * The arguments of the function that will be called
     */
    args: ContractFunctionArgs
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

export class Transaction {
    readonly intentId: UUID

    readonly from: Address

    readonly chainId: number

    readonly address: Address

    readonly functionName: string

    readonly args: ContractFunctionArgs

    // This doesn't need to match the Solidity contract name but must match the contract alias of one of the contracts that you have provided when initializing the transaction manager with the ABI Manager
    readonly contractName: string

    readonly deadline: number | undefined

    status: TransactionStatus

    readonly attempts: Attempt[]

    createdAt: Date

    updatedAt: Date

    /**
     * Stores additional information for the transaction.
     * Enables originators to provide extra details, such as gas limits, which can be leveraged by customizable services.
     */
    readonly metadata: Record<string, unknown>

    constructor({
        intentId,
        from,
        chainId,
        address,
        functionName,
        contractName,
        args,
        deadline,
        status,
        attempts,
        createdAt,
        updatedAt,
        metadata,
    }: TransactionConstructorConfig & {
        from: Address
        chainId: number
        intentId?: UUID
        status?: TransactionStatus
        attempts?: Attempt[]
        createdAt?: Date
        updatedAt?: Date
    }) {
        this.intentId = intentId ?? createUUID()
        this.from = from
        this.chainId = chainId
        this.address = address
        this.functionName = functionName
        this.contractName = contractName
        this.args = args
        this.deadline = deadline
        this.status = status ?? TransactionStatus.Pending
        this.attempts = attempts ?? []
        this.createdAt = createdAt ?? new Date()
        this.updatedAt = updatedAt ?? new Date()
        this.metadata = metadata ?? {}
    }

    addAttempt(attempt: Attempt): void {
        this.attempts.push(attempt)
        this.updatedAt = new Date()
    }

    removeAttempt(hash: Hash): void {
        const index = this.attempts.findIndex((attempt) => attempt.hash === hash)
        if (index > -1) {
            this.attempts.splice(index, 1)
        }
        this.updatedAt = new Date()
    }

    getInAirAttempts(): Attempt[] {
        const biggestNonce = this.attempts.reduce((acc, attempt) => Math.max(acc, attempt.nonce), 0)

        return this.attempts.filter((attempt) => attempt.nonce >= biggestNonce)
    }

    isExpired(block: LatestBlock, blockTime: bigint): boolean {
        return this.deadline ? block.timestamp + blockTime > BigInt(this.deadline) : false
    }

    changeStatus(status: TransactionStatus): void {
        this.status = status
        this.updatedAt = new Date()
        eventBus.emit(Topics.TransactionStatusChanged, {
            transaction: this,
        })
    }

    get attemptCount(): number {
        return this.attempts.length
    }

    get lastAttempt(): Attempt | undefined {
        return this.attempts[this.attempts.length - 1]
    }

    toDbRow(): Insertable<TransactionTable> {
        return {
            intentId: this.intentId,
            from: this.from,
            chainId: this.chainId,
            address: this.address,
            functionName: this.functionName,
            contractName: this.contractName,
            args: JSON.stringify(this.args, bigIntReplacer),
            deadline: this.deadline,
            status: this.status,
            attempts: JSON.stringify(this.attempts, bigIntReplacer),
            metadata: this.metadata ? JSON.stringify(this.metadata, bigIntReplacer) : undefined,
            createdAt: this.createdAt.getTime(),
            updatedAt: this.updatedAt.getTime(),
        }
    }

    static fromDbRow(row: Selectable<TransactionTable>): Transaction {
        return new Transaction({
            ...row,
            args: JSON.parse(row.args, bigIntReviver),
            attempts: JSON.parse(row.attempts, bigIntReviver),
            metadata: row.metadata ? JSON.parse(row.metadata, bigIntReviver) : undefined,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        })
    }
}
