import { BaseError, ContractFunctionRevertedError } from "viem"
import { isHexString } from "#lib/utils/zod/refines/isHexString"
import {
    ExecuteRevertedError,
    PaymentValidationRevertedError,
    PayoutFailedError,
    UnexpectedRevertedError,
    ValidationFailedError,
    ValidationRevertedError,
} from "./contract-errors"
import type { HappyBaseError } from "./happy-base-error"
import { decodeRawError, getErrorNameFromSelector } from "./parsedCodes"

function is0xString(str: unknown): str is `0x${string}` {
    return typeof str === "string" && isHexString(str)
}

/**
 * Will attempt to map the custom selector to a known error name.
 * If this is not available, we will return the raw selector.
 */
function parseRawArgs(args: readonly [] | readonly [`0x${string}`] | readonly [`0x${string}`, number]) {
    return args.map((a) => {
        if (typeof a !== "string") return a
        if (!is0xString(a)) return a
        return getErrorNameFromSelector(a) || a
    })
}

export function decodeViemError(_err: unknown) {
    const err = getBaseError(_err)
    if (!err) return
    if (!("raw" in err)) return
    if (!is0xString(err.raw)) return
    try {
        const error = decodeRawError(err.raw)

        if (!error) return
        const knownArgs = parseRawArgs(error.args)

        return {
            errorName: error.errorName,
            knownArgs,
            rawArgs: error.args,
            raw: err.raw,
        }
    } catch {
        return
    }
}

export function parseFromViemError(_err: unknown): HappyBaseError | undefined {
    const err = decodeViemError(_err)

    if (!err) return
    const [revertData] = err.knownArgs

    // TODO: unsure if this is the correct way to handle this
    if (
        typeof revertData !== "string" ||
        (err.raw === "0x" && "reason" in err && err.reason === "execution reverted")
    ) {
        throw new ExecuteRevertedError("Out Of Gas")
    }

    switch (err.errorName) {
        // === FAILED ERRORS ===================================================================
        case "ValidationRejected": {
            return new ValidationFailedError(revertData)
        }
        case "PayoutFailed": {
            return new PayoutFailedError(revertData)
        }
        case "InvalidNonce": {
            return new ValidationFailedError("InvalidNonce")
        }

        // === REVERT ERRORS ===================================================================
        case "ValidationReverted": {
            // TODO: is this a reliable way to check out of gas?
            return new ValidationRevertedError((revertData as string) === "0x" ? "Out Of Gas" : revertData)
        }
        case "PaymentValidationReverted": {
            return new PaymentValidationRevertedError(revertData)
        }
        default: {
            return new UnexpectedRevertedError(revertData)
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
