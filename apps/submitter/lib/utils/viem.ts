import { stringify as _stringify } from "@happy.tech/common"
import { BaseError } from "viem"

// TODO might not be needed anymore
export function stringify(value: unknown): string {
    // Cut on the verbosity
    if (value instanceof BaseError) return value.message
    return _stringify(value)
}

export function isNonceTooLowError(error: unknown) {
    return (
        error instanceof Error &&
        (error.message.includes("nonce too low") || error.message.includes("is lower than the current nonce"))
    )
}
