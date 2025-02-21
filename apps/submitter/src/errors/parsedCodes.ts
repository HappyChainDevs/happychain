import { getAbiItem, parseAbi, toFunctionSelector } from "viem/utils"
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
const abi = parseAbi([
    // IHappyAccount.sol ErrorSelectors
    "function InvalidNonce()",
    "function GasPriceTooHigh()",
    "function WrongAccount()",
    "function FutureNonceDuringSimulation()",
    // Common.sol ErrorSelectors
    "function FutureNonceDuringSimulation()",
    "function UnknownDuringSimulation()",
    "function NotFromEntryPoint()",
    "function InvalidOwnerSignature()",
    // IHappyPaymaster.sol ErrorSelectors
    "function WrongTarget()",
    "function InvalidOwnerSignature()",
])
// Attempts
export const getErrorNameFromSelector = (selector: `0x${string}`) => getAbiItem({ abi: abi, name: selector })?.name
export const getSelectorFromErrorName = (name: string) => {
    const item = abi.find((a) => a.name === name)
    return item ? toFunctionSelector(item) : undefined
}
