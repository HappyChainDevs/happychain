import type { BaseError } from "viem"
import { ValidationFailedError, ValidationRevertedError } from "."

export function parseFromViemError(_err: unknown) {
    const err = getRootBaseError(_err)
    if (!err) return null

    if (err?.metaMessages?.length) {
        const [message, code] = err.metaMessages as [string, string]
        switch (message) {
            case "Error: ValidationReverted(bytes revertData)": {
                const regex = code.match(/\W\((0x[0-9a-fA-F]*)\)/)
                if (regex?.length && regex[1]) return new ValidationRevertedError(regex[1] as `0x${string}`)
                return new ValidationRevertedError()
            }

            case "Error: ValidationFailed(bytes4 reason)": {
                const regex = code.match(/\W\((0x[0-9a-fA-F]+)\)/)
                if (regex?.length && regex[1]) return new ValidationFailedError(undefined, regex[1] as `0x${string}`)
                return new ValidationFailedError()
            }
        }
    }
}

function getRootBaseError(err: unknown): BaseError | null {
    if (!err || typeof err !== "object" || !("cause" in err)) return null
    return ((err as BaseError)?.cause ?? err) as BaseError
}
