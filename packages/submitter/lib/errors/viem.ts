import { type Hex, hasKey } from "@happy.tech/common"
import {
    type AbiFunction,
    BaseError,
    ContractFunctionRevertedError,
    type Log,
    RawContractError,
    decodeEventLog,
    toEventSelector,
} from "viem"
import { decodeErrorResult, getAbiItem, toFunctionSelector } from "viem/utils"
import { errorsAbi, errorsAsFunctionsAbi, eventsAbi } from "#lib/errors/errorsAbi"

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

    const contractRevertError = getContractRevertError(err)
    if (contractRevertError) {
        const decoded = decodeError(contractRevertError)
        return { decoded, raw: contractRevertError.raw, isContractRevert: true }
    }

    // In the context of the submitter, we always call with Viem's `simulateContract` and proper ABIs. So  if there is
    // any revert data at all, we expect to get a ContractFunctionRevertedError and for it to hold decoded data. A boop
    // should not be able to revert arbitrarily: we intercept the call's revert and wrap it in one of our own errors.

    // However, let's keep going, because we can. The approach that follows is pulled from Viem's `call` implementation.
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
// TODO make private after submit refactored
export function getContractRevertError(err: unknown): ContractFunctionRevertedError | undefined {
    if (!hasKey(err, "cause") || !(err instanceof BaseError)) return undefined
    return err.walk(isRevertError) as ContractFunctionRevertedError | undefined
}

function isRevertError(err: unknown): err is ContractFunctionRevertedError {
    return err instanceof ContractFunctionRevertedError
}

/**
 * Extracts a decoded error, if possible, from a {@link ContractFunctionRevertedError}, which can be obtained via {@link
 * getContractRevertError}, otherwise returns undefined if the error does not carry error data or if the error isn't known.
 */
function decodeError(err: ContractFunctionRevertedError): DecodedRevertError | undefined {
    // The alternate is only ever useful if whatever generated this error did not have the proper ABI available,
    // which should never be the case.
    return (err.data || (err.raw && decodeRawError(err.raw))) as DecodedRevertError | undefined
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
        // Using errors here doesn't work. Thank you Viem. Typing is also broken :')
        return (getAbiItem({ abi: errorsAsFunctionsAbi, name: selector }) as AbiFunction)?.name
    } catch {
        return
    }
}

/**
 * An ABI-decoded event.
 */
export type DecodedEvent = {
    /** Name of the event. */
    eventName: string
    /** Map argument names to their values. */
    args: Record<string, unknown>
}

/**
 * Attempts to decode the given log against known abis, returning the result or undefined if not known.
 */
export function decodeEvent(log: Log): DecodedEvent | undefined {
    try {
        return decodeEventLog({ abi: eventsAbi, data: log.data, topics: log.topics })
    } catch {
        return
    }
}

/**
 * Converts a known event name into its 4 bytes selector, or return undefined if the event isn't known.
 */
export function getSelectorFromEventName(name: string): Hex | undefined {
    const item = eventsAbi.find((a) => a.name === name)
    // toErrorSelector? who needs that? :')
    return item ? toEventSelector(item) : undefined
}
