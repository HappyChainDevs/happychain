import type { Address, ContractFunctionArgs } from "viem"

export class Transaction {
    readonly chainId: number
    readonly address: Address
    readonly functionName: string
    readonly args: ContractFunctionArgs | undefined
    readonly alias: string

    constructor(
        _chainId: number,
        _address: Address,
        _functionName: string,
        _alias: string,
        _args: ContractFunctionArgs | undefined,
    ) {
        this.chainId = _chainId
        this.address = _address
        this.functionName = _functionName
        this.alias = _alias
        this.args = _args
    }

    static createWithAlias(
        chainId: number,
        address: Address,
        functionName: string,
        alias: string,
        args?: ContractFunctionArgs,
    ): Transaction {
        return new Transaction(chainId, address, functionName, alias, args)
    }
}
