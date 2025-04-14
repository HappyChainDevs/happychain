import type { AbiFunction } from "viem"
import { decodeErrorResult, getAbiItem, parseAbi, toFunctionSelector } from "viem/utils"
import { logger } from "#lib/logger"

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

const errors = parseAbi([
    "error SubmitterFeeTooHigh()",
    "error MalformedBoop()",
    "error WithdrawDelayTooShort()",
    "error WithdrawDelayTooLong()",
    "error InsufficientBalance()",
    "error EarlyWithdraw()",
    "error InvalidBatchCallInfo()",
    "error AccountPaidSessionKeyBoop()",
    "error CannotRegisterSessionKeyForValidator()",
    "error CannotRegisterSessionKeyForAccount()",
    "error NotSelfOrOwner()",
    "error InitializeError()",
    "error AlreadyDeployed()",
    "error InsufficientGasBudget()",
    "error GasPriceTooHigh()",
    "error InsufficientStake()",
    "error InvalidNonce()",
    "error ValidationReverted(bytes revertData)",
    "error ValidationRejected(bytes reason)",
    "error PaymentValidationReverted(bytes revertData)",
    "error PaymentValidationRejected(bytes reason)",
    "error PayoutFailed()",
    "error UnknownDuringSimulation()",
    "error NotFromEntryPoint()",
    "error InvalidSignature()",
    "error ExtensionAlreadyRegistered(address extension, uint8 extensionType)",
    "error ExtensionNotRegistered(address extension, uint8 extensionType)",
    "error InvalidExtensionValue()",
    "error SubmitterFeeTooHigh()",
])

const functions = parseAbi([
    "function SubmitterFeeTooHigh()",
    "function MalformedBoop()",
    "function WithdrawDelayTooShort()",
    "function WithdrawDelayTooLong()",
    "function InsufficientBalance()",
    "function EarlyWithdraw()",
    "function InvalidBatchCallInfo()",
    "function AccountPaidSessionKeyBoop()",
    "function CannotRegisterSessionKeyForValidator()",
    "function CannotRegisterSessionKeyForAccount()",
    "function NotSelfOrOwner()",
    "function InitializeError()",
    "function AlreadyDeployed()",
    "function InsufficientGasBudget()",
    "function GasPriceTooHigh()",
    "function InsufficientStake()",
    "function InvalidNonce()",
    "function ValidationReverted(bytes revertData)",
    "function ValidationRejected(bytes reason)",
    "function PaymentValidationReverted(bytes revertData)",
    "function PaymentValidationRejected(bytes reason)",
    "function PayoutFailed()",
    "function UnknownDuringSimulation()",
    "function NotFromEntryPoint()",
    "function InvalidSignature()",
    "function ExtensionAlreadyRegistered(address extension, uint8 extensionType)",
    "function ExtensionNotRegistered(address extension, uint8 extensionType)",
    "function InvalidExtensionValue()",
    "function SubmitterFeeTooHigh()",
])

if (functions.length !== errors.length) {
    logger.warn(
        "Known ABI Errors length mismatch. Please check all possible errors are registered in both 'errors' and 'functions' abis.",
    )
}

export function getErrorNameFromSelector(selector: `0x${string}`) {
    return getAbiItem({ abi: errors, name: selector })?.name ?? getAbiItem({ abi: functions, name: selector })?.name
}

export function getSelectorFromErrorName(name: string) {
    const item = functions.find((a) => a.name === name) as AbiFunction | undefined
    return item ? toFunctionSelector(item) : undefined
}

export function decodeRawError(data: `0x${string}`) {
    if (data === "0x") return
    const err = decodeErrorResult({ abi: errors, data })
    return {
        ...err,
        args: err.args ?? [],
    }
}
