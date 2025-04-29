export enum CheckResult {
    Success = "success",
    Failure = "failure",
}

export class Check {
    readonly blockNumber: bigint
    readonly blockTimestamp: bigint
    readonly result: CheckResult
    readonly errorDescription: string | undefined
    readonly value: string | undefined

    constructor(
        blockNumber: bigint,
        blockTimestamp: bigint,
        result: CheckResult,
        errorDescription?: string,
        value?: string,
    ) {
        this.blockNumber = blockNumber
        this.blockTimestamp = blockTimestamp
        this.result = result
        this.errorDescription = errorDescription
        this.value = value
    }
}
