import { bigIntToZeroPadded } from "@happy.tech/common"
import { Monitoring, type MonitoringResult } from "../Monitoring"
import { DIGITS_MAX_UINT256 } from "../constants"

export interface MonitoringRow {
    blockNumber: string
    blockTimestamp: string
    result: MonitoringResult
}

export function monitoringRowToEntity(row: MonitoringRow): Monitoring {
    return new Monitoring(BigInt(row.blockNumber), BigInt(row.blockTimestamp), row.result)
}

export function monitoringEntityToRow(entity: Monitoring): MonitoringRow {
    return {
        blockNumber: bigIntToZeroPadded(entity.blockNumber, DIGITS_MAX_UINT256),
        blockTimestamp: bigIntToZeroPadded(entity.blockTimestamp, DIGITS_MAX_UINT256),
        result: entity.result,
    }
}

export interface Database {
    monitoring: MonitoringRow
}
