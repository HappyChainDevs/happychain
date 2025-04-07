import { Monitoring, type MonitoringResult } from "../Monitoring"

export interface MonitoringRow {
    blockNumber: number
    blockTimestamp: number
    result: MonitoringResult
    errorDescription: string | undefined
    value: string | undefined
}

export function monitoringRowToEntity(row: MonitoringRow): Monitoring {
    return new Monitoring(
        BigInt(row.blockNumber),
        BigInt(row.blockTimestamp),
        row.result,
        row.errorDescription,
        row.value,
    )
}

export function monitoringEntityToRow(entity: Monitoring): MonitoringRow {
    return {
        blockNumber: Number(entity.blockNumber),
        blockTimestamp: Number(entity.blockTimestamp),
        result: entity.result,
        errorDescription: entity.errorDescription,
        value: entity.value,
    }
}

export interface Database {
    monitoring: MonitoringRow
}
