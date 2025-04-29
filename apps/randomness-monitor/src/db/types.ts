import { Check, type CheckResult } from "../Check"

export interface CheckRow {
    blockNumber: number
    blockTimestamp: number
    result: CheckResult
    errorDescription: string | undefined
    value: string | undefined
}

export function checkRowToEntity(row: CheckRow): Check {
    return new Check(
        BigInt(row.blockNumber),
        BigInt(row.blockTimestamp),
        row.result,
        row.errorDescription,
        row.value,
    )
}

export function checkEntityToRow(entity: Check): CheckRow {
    return {
        blockNumber: Number(entity.blockNumber),
        blockTimestamp: Number(entity.blockTimestamp),
        result: entity.result,
        errorDescription: entity.errorDescription,
        value: entity.value,
    }
}

export interface Database {
    checks: CheckRow
}
