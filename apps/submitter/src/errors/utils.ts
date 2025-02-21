import type { BaseError } from "viem"
import { PaymentRevertedError, ValidationFailedError, ValidationRevertedError } from "."
import { getErrorNameFromSelector } from "./parsedCodes"

export function parseFromViemError(_err: unknown) {
    const err = getRootBaseError(_err)
    if (!err) return

    if (err?.metaMessages?.length) {
        const [message, code] = err.metaMessages as string[]
        const revertData = code?.trim().match(/\((0x[0-9a-fA-F]{8,64})\)/)?.[1] as `0x${string}` | undefined
        const reason = revertData && getErrorNameFromSelector(revertData)
        switch (message) {
            case "Error: ValidationReverted(bytes revertData)": {
                return new ValidationRevertedError(reason)
            }
            case "Error: ValidationFailed(bytes4 reason)": {
                return new ValidationFailedError(undefined, reason)
            }
            case "Error: PaymentReverted(bytes revertData)": {
                return new PaymentRevertedError(reason)
            }
        }
    }
}

function getRootBaseError(err: unknown): BaseError | null {
    if (!err || typeof err !== "object" || !("cause" in err)) return null
    return ((err as BaseError)?.cause ?? err) as BaseError
}
