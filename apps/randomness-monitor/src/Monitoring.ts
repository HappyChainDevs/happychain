export enum MonitoringResult {
    Success = "success",
    Failure = "failure",
}

export class Monitoring {
    readonly blockNumber: bigint
    readonly blockTimestamp: bigint
    readonly result: MonitoringResult

    constructor(blockNumber: bigint, blockTimestamp: bigint, result: MonitoringResult) {
        this.blockNumber = blockNumber
        this.blockTimestamp = blockTimestamp
        this.result = result
    }
}
