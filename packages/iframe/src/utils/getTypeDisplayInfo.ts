import { isAddress, isHex } from "viem"

/**
 * Determines a human-readable `displayValue` and `displayType` based on the argument's type and content.
 *
 * Behavior:
 * - For `string`:
 *   - If the string is recognized as an Ethereum address (`isAddress`), `displayType` is set to `"address"`.
 *   - If the string is recognized as hex data (`isHex`), `displayType` is set to `"hex"`.
 *   - Otherwise, it remains `"string"`.
 *
 * - For `bigint`:
 *   - The `displayValue` is converted to a string.
 *   - `displayType` remains `"bigint"`.
 *
 * - For other types (`number`, `boolean`, `symbol`, `undefined`, `object`, `function`):
 *   - No special handling is applied.
 *   - `displayValue` is just `String(arg)`, and `displayType` is `typeof arg`.
 *
 * Examples:
 * - `arg = "0x123...abc"` (valid hex, not necessarily address) -> displayValue: "0x123...abc", displayType: "hex"
 * - `arg = "0x1234567890abcdef1234567890abcdef12345678"` (valid 20-byte address) -> displayValue: same string, displayType: "address"
 * - `arg = 42` -> displayValue: "42", displayType: "number"
 * - `arg = 1000n` (bigint) -> displayValue: "1000", displayType: "bigint"
 * - `arg = "hello"` (simple string) -> displayValue: "hello", displayType: "string"
 */

export interface TypeDisplayInfo {
    displayValue: string
    displayType: string
}

export function getTypeDisplayInfo(arg: unknown): TypeDisplayInfo {
    const rawType = typeof arg
    let displayValue = String(arg)
    let displayType: string = rawType

    if (rawType === "string") {
        const str = arg as string
        if (isAddress(str)) {
            displayType = "address"
        } else if (isHex(str)) {
            displayType = "hex"
        }
    } else if (rawType === "bigint") {
        displayValue = (arg as bigint).toString()
    }

    return { displayValue, displayType }
}
