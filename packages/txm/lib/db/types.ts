import type { Address, Hex, UUID } from "@happy.tech/common"
import type { TransactionStatus } from "../Transaction"

export interface TransactionTable {
    intentId: UUID
    from: Address
    chainId: number
    address: Address
    value: string
    functionName: string | undefined
    args: string | undefined
    contractName: string | undefined
    calldata: Hex
    deadline: number | undefined
    status: TransactionStatus
    attempts: string
    collectionBlock: number | undefined
    metadata: string | undefined
    createdAt: number
    updatedAt: number
}

export interface Database {
    transaction: TransactionTable
}
