import { type UUID, createUUID } from "@happychain/common"
import { Entity, PrimaryKey, Property } from "@mikro-orm/core"
import type { Address, ContractFunctionArgs } from "viem"

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

    @Property({ nullable: true, type: "integer" })
    readonly deadline: number | undefined

    constructor({
        intentId,
        chainId,
        address,
        functionName,
        alias,
        args,
        deadline,
    }: {
        intentId?: UUID | undefined
        chainId: number
        address: Address
        functionName: string
        alias: string
        args: ContractFunctionArgs | undefined
        deadline?: number | undefined
    }) {
        this.intentId = intentId ?? createUUID()
        this.chainId = chainId
        this.address = address
        this.functionName = functionName
        this.contractName = alias
        this.args = args
        this.deadline = deadline
    }
}
