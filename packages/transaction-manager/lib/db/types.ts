import type { UUID } from "@happychain/common"
import type { JSONColumnType } from "kysely"
import type { Address, ContractFunctionArgs } from "viem"
import type { Attempt, TransactionStatus } from "../Transaction"

export interface TransactionTable {
    intentId: UUID
    chainId: number
    address: Address
    functionName: string
    args: JSONColumnType<ContractFunctionArgs>
    contractName: string
    deadline: number | undefined
    status: TransactionStatus
    attempts: JSONColumnType<Attempt[]>
    metadata: JSONColumnType<Record<string, unknown>> | undefined
}

export interface Database {
    transaction: TransactionTable
}
