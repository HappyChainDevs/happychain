import { type Hex, getProp, hasKey, stringify } from "@happy.tech/common"
import { type AbiFunction, BaseError, ContractFunctionRevertedError, RawContractError } from "viem"
import { decodeErrorResult, getAbiItem, toFunctionSelector } from "viem/utils"
import { errorsAbi, errorsAsFunctionsAbi } from "./abis"

/**
 * Optional raw & decoded view of a contract revert error. In general, if the decoded
 * error is available, so will the raw one, but probably better to not make assumptions.
 *
 * Also includes a boolean to indicate whether we found an indication that the error is a revert at all.
 */
export type RevertErrorInfo = {
    decoded?: DecodedRevertError
    raw?: Hex
    isContractRevert: boolean
}

/**
 * Decoded contract error, including the ABI name of the error and the value of its arguments.
 */
export type DecodedRevertError = {
    errorName: string
    args: readonly unknown[]
}

export function getRevertError(err: unknown): RevertErrorInfo {
    // This is not a Viem error, bail out.
    if (!(err instanceof BaseError)) return { isContractRevert: false }

    const revErr = getContractRevertError(err)
    if (revErr) {
        // The alternate is only ever useful if whatever generated this error did not have the proper ABI available,
        // which should never be the case.
        const decoded = (revErr.data || (revErr.raw && decodeRawError(revErr.raw))) as DecodedRevertError | undefined
        return { decoded, raw: revErr.raw, isContractRevert: true }
    }

    // In the context of the submitter, we always call with Viem's `simulateContract` and proper ABIs. So if there is
    // any revert data at all, we expect to get a ContractFunctionRevertedError and for it to hold decoded data. A boop
    // should not be able to revert arbitrarily: we intercept the call's revert and wrap it in one of our own errors.

    // However, let's keep going, because we can. The approach that follows is pulled from Viem's `call` implementation.
    // `err.walk()` follow the `.cause` chain until the end. The cast is unsafe but we validate access.
    const rawErr = err.walk() as RawContractError

    const raw = typeof rawErr?.data === "object" ? rawErr.data?.data : rawErr.data
    return {
        decoded: raw && decodeRawError(raw),
        raw,
        isContractRevert: rawErr instanceof RawContractError,
    }
}

/**
 * Checks if the error or one of the error in its `.cause`  chain is a Viem revert error, and returns the first one
 * that is found, or undefined if none is found.
 */
function getContractRevertError(err: unknown): ContractFunctionRevertedError | undefined {
    if (!hasKey(err, "cause") || !(err instanceof BaseError)) return undefined
    return err.walk(isRevertError) as ContractFunctionRevertedError | undefined
}

function isRevertError(err: unknown): err is ContractFunctionRevertedError {
    return err instanceof ContractFunctionRevertedError
}

/**
 * Decodes raw revert data into a decoded error if possible, otherwise returns undefined if we can't find a known error
 * that matches the data.
 */
export function decodeRawError(data: Hex): DecodedRevertError | undefined {
    if (data === "0x" || data.length < 10) return // 10 = 0x + 4 bytes
    try {
        const err = decodeErrorResult({ abi: errorsAbi, data })
        return {
            errorName: err.errorName,
            args: (err.args as readonly unknown[]) ?? [],
        }
    } catch {
        return
    }
}

/**
 * Converts a known error name into its 4 bytes selector, or return undefined if the error isn't known.
 */
export function getSelectorFromErrorName(name: string): Hex | undefined {
    const item = errorsAsFunctionsAbi.find((e) => e.name === name)
    // toErrorSelector? who needs that? :')
    return item ? toFunctionSelector(item) : undefined
}

/**
 * Returns a known error name from its 4 bytes selector, or return undefined if the selector isn't known.
 */
export function getErrorNameFromSelector(selector: Hex): string | undefined {
    try {
        // Using errors here doesn't work. Thank you Viem.
        return (getAbiItem({ abi: errorsAsFunctionsAbi, name: selector }) as AbiFunction)?.name
    } catch {
        return
    }
}

/**
 * Attempts to extract a string description from the error, falling back to undefined if failing.
 */
export function extractErrorMessage(error: unknown): string | undefined {
    // biome-ignore format: beauty
    return stringify(getProp(error, "message")
            ?? stringify(getProp(error, "shortMessage"))
            ?? stringify(getProp(error, "details")))
        ?? stringify(error)
}
