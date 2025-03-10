import { BaseError, ContractFunctionRevertedError } from "viem"
import type { HappyBaseError } from "./index"
import {
    ExecuteRevertedError,
    PaymentFailedError,
    PaymentRevertedError,
    ValidationFailedError,
    ValidationRevertedError,
} from "./index"
import { decodeRawError, getErrorNameFromSelector } from "./parsedCodes"

function is0xString(str: unknown): str is `0x${string}` {
    return typeof str === "string" && str.startsWith("0x")
}

/**
 * Will attempt to map the custom selector to a known error name.
 * If this is not available, we will return the raw selector.
 */
function parseRawArgs(args: readonly `0x${string}`[]) {
    return args.map((a) => getErrorNameFromSelector(a) || a)
}
export function parseFromViemError(_err: unknown): HappyBaseError | undefined {
    const err = getBaseError(_err)

    if (!err) return
    if ("raw" in err && is0xString(err.raw)) {
        // TODO: unsure if this is the correct way to handle this
        if (err.raw === "0x" && "reason" in err && err.reason === "execution reverted") {
            throw new ExecuteRevertedError("Out Of Gas")
        }
        const error = decodeRawError(err.raw)

        const [revertData] = parseRawArgs(error.args)
        switch (error.errorName) {
            // === FAILED ERRORS ===================================================================
            case "ValidationFailed": {
                return new ValidationFailedError(undefined, revertData)
            }
            // case "ExecuteFailed": {
            //     return new ExecuteFailedError(undefined, revertData)
            // }
            case "PaymentFailed": {
                return new PaymentFailedError(undefined, revertData)
            }

            // === REVERT ERRORS ===================================================================
            case "ValidationReverted": {
                // TODO: when executeGasLimit === 1 this is '0x' - is this an Out Of Gas error?
                return new ValidationRevertedError((revertData as string) === "0x" ? "Out Of Gas" : revertData)
            }
            // case "ExecuteReverted": {
            //     return new ExecuteRevertedError(revertData)
            // }
            case "PaymentReverted": {
                return new PaymentRevertedError(revertData)
            }
            // case "UnexpectedReverted": {
            //     return new UnexpectedRevertedError(revertData)
            // }
        }
    }
}

function getRevertError(err: unknown) {
    return err instanceof ContractFunctionRevertedError
}

export function getBaseError(err: unknown): BaseError | null {
    if (!err) return null
    if (typeof err !== "object") return null
    if (!("cause" in err)) return null
    if (!(err instanceof BaseError)) return null

    const revertError = err.walk(getRevertError) as BaseError | null
    return revertError ?? err
}
