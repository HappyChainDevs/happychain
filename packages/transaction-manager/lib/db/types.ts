import type { UUID } from "@happychain/common"
import type { Address } from "viem"
import type { TransactionStatus } from "../Transaction"

export interface TransactionTable {
    intentId: UUID
    from: Address
    chainId: number
    address: Address
    functionName: string
    args: string
    contractName: string
    deadline: number | undefined
    status: TransactionStatus
    attempts: string
    metadata: string | undefined
    createdAt: number
    updatedAt: number
}

export interface Database {
    transaction: TransactionTable
}
