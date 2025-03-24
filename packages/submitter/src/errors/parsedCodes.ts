import type { AbiFunction } from "viem"
import { decodeErrorResult, getAbiItem, parseAbi, toFunctionSelector } from "viem/utils"

/**
 * Used to calculate the selectors for the following _errors_
 *
 * i.e.
 * this definition is from the contract
 * `error InvalidNonce()` => `0x756688fe`
 *
 * and here would be how to convert between the two
 * (notice to parse the ABI error, replace 'error' with 'function'):
 * ```ts
 * getAbiItem({ abi: abi, name: '0x756688fe' })?.name //=> 'InvalidNonce'
 * toFunctionSelector("function InvalidNonce()") //=> '0x756688fe'
 * ```
 */
export const errorAbi = parseAbi([
    // IHappyAccount.sol ErrorSelectors
    "function InvalidNonce()",
    "function GasPriceTooHigh()",
    "function WrongAccount()",
    "function FutureNonceDuringSimulation()",
    // This is a bit silly, but decodeErrorResult only works on 'error'
    // but getAbiItem only works on 'function', so we have both
    "error InvalidNonce()",
    "error GasPriceTooHigh()",
    "error WrongAccount()",
    "error FutureNonceDuringSimulation()",

    // Common.sol ErrorSelectors
    "function FutureNonceDuringSimulation()",
    "function UnknownDuringSimulation()",
    "function NotFromEntryPoint()",
    "function InvalidOwnerSignature()",
    "error FutureNonceDuringSimulation()",
    "error UnknownDuringSimulation()",
    "error NotFromEntryPoint()",
    "error InvalidOwnerSignature()",

    // IHappyPaymaster.sol ErrorSelectors
    "function WrongTarget()",
    "function InvalidOwnerSignature()",
    "error WrongTarget()",
    "error InvalidOwnerSignature()",

    // HappyEntryPoint.sol ErrorSelectors
    "function ValidationReverted(bytes revertData)",
    "function ValidationFailed(bytes4 reason)",
    "function PaymentFailed(bytes4 result)",
    "function PaymentReverted(bytes revertData)",
    "error ValidationReverted(bytes revertData)",
    "error ValidationFailed(bytes4 reason)",
    "error PaymentFailed(bytes4 result)",
    "error PaymentReverted(bytes revertData)",

    // https://vectorized.github.io/solady/#/utils/ecdsa?id=toethsignedmessagehashbytes
    "function InvalidSignature()",
    "error InvalidSignature()",
])

export function getErrorNameFromSelector(selector: `0x${string}`) {
    return getAbiItem({ abi: errorAbi, name: selector })?.name
}

export function getSelectorFromErrorName(name: string) {
    const item = errorAbi.find((a) => a.type === "function" && a.name === name) as AbiFunction | undefined
    return item ? toFunctionSelector(item) : undefined
}

export function decodeRawError(data: `0x${string}`) {
    if (data === "0x") return { errorName: "Unknown", args: [] }
    return decodeErrorResult({ abi: errorAbi, data })
}
