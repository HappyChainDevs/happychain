export enum MonitoringResult {
    Success = "success",
    Failure = "failure",
}

export class Monitoring {
    readonly blockNumber: bigint
    readonly blockTimestamp: bigint
    readonly result: MonitoringResult
    readonly errorDescription: string | undefined
    readonly value: string | undefined

    constructor(
        blockNumber: bigint,
        blockTimestamp: bigint,
        result: MonitoringResult,
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
