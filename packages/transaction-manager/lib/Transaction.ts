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

    constructor({
        intentId,
        chainId,
        address,
        functionName,
        alias,
        args,
    }: {
        intentId?: UUID | undefined
        chainId: number
        address: Address
        functionName: string
        alias: string
        args: ContractFunctionArgs | undefined
    }) {
        this.intentId = intentId ?? createUUID()
        this.chainId = chainId
        this.address = address
        this.functionName = functionName
        this.contractName = alias
        this.args = args
    }
}
