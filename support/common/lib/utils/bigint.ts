import type { Prettify } from "../utils/types"

/**
 * Returns the maximum value among the given BigInt arguments.
 * @param values - One or more BigInt values to compare.
 * @returns The maximum BigInt value.
 * @throws {Error} If no arguments are provided.
 */
export function bigIntMax(...values: bigint[]): bigint {
    if (values.length === 0) {
        throw new Error("At least one argument must be provided")
    }

    return values.reduce((max, current) => {
        return current > max ? current : max
    })
}

/**
 * Function to handle `bigint` serialization
 */
export const bigIntReplacer = (_key: string, value: unknown): unknown => {
    return typeof value === "bigint" ? `#bigint.${value}` : value
}

/**
 * Function to handle `bigint` deserialization
 */
export const bigIntReviver = (_key: string, value: unknown): unknown => {
    return typeof value === "string" && value.startsWith("#bigint.") ? BigInt(value.slice(8)).valueOf() : value
}

/**
 * The maximum number of digits in the max uint256 value
 */
export const DIGITS_MAX_UINT256 = 78

/**
 * Converts a bigint to a zero-padded string representation
 * @param value - The bigint value to convert
 * @param totalDigits - The total number of digits in the resulting string (defaults to {@link DIGITS_MAX_UINT256})
 * @returns A string representation of the bigint with leading zeros to match the specified length
 * @example
 * bigIntToZeroPadded(123n, 5) // returns "00123"
 */
export function bigIntToZeroPadded(value: bigint, totalDigits: number = DIGITS_MAX_UINT256): string {
    const str = value.toString()
    return str.padStart(totalDigits, "0")
}

// Utility type to transform all bigint fields to string
export type BigIntSerialized<T> = Prettify<{
    [K in keyof T]: T[K] extends bigint ? string : T[K] extends object ? BigIntSerialized<T[K]> : T[K]
}>

/**
 * Utility functions to serialize and deserialize `bigint` values.
 * - Designed for use with `JSON.stringify` and `JSON.parse`.
 * - Normally, we mark `bigint` fields with `#bigint`, but here we serialize them using [`toString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt/toString) for better compatibility with open APIs.
 */
export function serializeBigInt<T>(obj: T): BigIntSerialized<T> {
    if (typeof obj === "bigint") {
        return obj.toString() as BigIntSerialized<T>
    } else if (Array.isArray(obj)) {
        return obj.map((item) => serializeBigInt(item)) as unknown as BigIntSerialized<T>
    } else if (obj !== null && typeof obj === "object") {
        const serializedObj = {} as Record<string, unknown>
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                serializedObj[key] = serializeBigInt((obj as T)[key])
            }
        }
        return serializedObj as BigIntSerialized<T>
    }
    return obj as BigIntSerialized<T>
}

/** Returns a parsed bigint from the input, or undefined if unable to parse. */
export function parseBigInt(input: string | undefined): bigint | undefined {
    try {
        return input ? BigInt(input) : undefined
    } catch {
        return undefined
    }
}
