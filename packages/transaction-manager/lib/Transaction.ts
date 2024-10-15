import { type UUID, createUUID } from "@happychain/common"
import { Entity, PrimaryKey, Property } from "@mikro-orm/core"
import type { Address, ContractFunctionArgs, Hash } from "viem"
import type { LatestBlock } from "./BlockMonitor"
import { JsonBigIntTypeOrm } from "./JsonBigIntTypeOrm.js"

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

@Entity()
export class Transaction {
    @PrimaryKey()
    readonly intentId: UUID

    @Property()
    readonly chainId: number

    @Property()
    readonly address: Address

    @Property()
    readonly functionName: string

    @Property()
    readonly args: ContractFunctionArgs | undefined

    @Property()
    readonly contractName: string

    @Property({ type: "integer", nullable: true })
    readonly deadline: number | undefined

    @Property({ type: "string" })
    status: TransactionStatus

    @Property({ type: JsonBigIntTypeOrm })
    readonly attempts: Attempt[]

    constructor({
        intentId,
        chainId,
        address,
        functionName,
        alias,
        args,
        deadline,
        status,
        attempts,
    }: {
        intentId?: UUID
        chainId: number
        address: Address
        functionName: string
        alias: string
        args: ContractFunctionArgs
        deadline?: number
        status?: TransactionStatus
        attempts?: Attempt[]
    }) {
        this.intentId = intentId ?? createUUID()
        this.chainId = chainId
        this.address = address
        this.functionName = functionName
        this.contractName = alias
        this.args = args
        this.deadline = deadline
        this.status = status ?? TransactionStatus.Pending
        this.attempts = attempts ?? []
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
}
