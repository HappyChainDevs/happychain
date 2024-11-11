import { type UUID, bigIntReplacer, bigIntReviver, createUUID } from "@happychain/common"
import type { Insertable, Selectable } from "kysely"
import type { Address, ContractFunctionArgs, Hash } from "viem"
import type { LatestBlock } from "./BlockMonitor"
import type { TransactionTable } from "./db/types.js"

export enum TransactionStatus {
    Pending = "Pending",
    Failed = "Failed",
    Expired = "Expired",
    Cancelling = "Cancelling",
    Cancelled = "Cancelled",
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

export class Transaction {
    readonly intentId: UUID

    readonly chainId: number

    readonly address: Address

    readonly functionName: string

    readonly args: ContractFunctionArgs

    readonly contractName: string

    readonly deadline: number | undefined

    status: TransactionStatus

    readonly attempts: Attempt[]

    /**
     * Stores additional information for the transaction.
     * Enables originators to provide extra details, such as gas limits, which can be leveraged by customizable services.
     */
    metadata: Record<string, unknown> | undefined

    constructor({
        intentId,
        chainId,
        address,
        functionName,
        contractName,
        args,
        deadline,
        status,
        attempts,
        metadata,
    }: {
        intentId?: UUID
        chainId: number
        address: Address
        functionName: string
        contractName: string
        args: ContractFunctionArgs
        deadline?: number
        status?: TransactionStatus
        attempts?: Attempt[]
        metadata?: Record<string, unknown>
    }) {
        this.intentId = intentId ?? createUUID()
        this.chainId = chainId
        this.address = address
        this.functionName = functionName
        this.contractName = contractName
        this.args = args
        this.deadline = deadline
        this.status = status ?? TransactionStatus.Pending
        this.attempts = attempts ?? []
        this.metadata = metadata
    }

    addAttempt(attempt: Attempt): void {
        this.attempts.push(attempt)
    }

    removeAttempt(hash: Hash): void {
        const index = this.attempts.findIndex((attempt) => attempt.hash === hash)
        if (index > -1) {
            this.attempts.splice(index, 1)
        }
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
            chainId: this.chainId,
            address: this.address,
            functionName: this.functionName,
            contractName: this.contractName,
            args: JSON.stringify(this.args, bigIntReplacer),
            deadline: this.deadline,
            status: this.status,
            attempts: JSON.stringify(this.attempts, bigIntReplacer),
            metadata: this.metadata ? JSON.stringify(this.metadata, bigIntReplacer) : undefined,
        }
    }

    static fromDbRow(row: Selectable<TransactionTable>): Transaction {
        return new Transaction({
            ...row,
            args: JSON.parse(row.args, bigIntReviver),
            attempts: JSON.parse(row.attempts, bigIntReviver),
            metadata: row.metadata ? JSON.parse(row.metadata, bigIntReviver) : undefined,
        })
    }
}
