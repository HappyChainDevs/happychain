import { hasOwnKey } from "./objects"
import type { RecursiveReplace } from "./types"

/**
 * Returns the maximum value among the arguments, or 0n if no values are provided.
 */
export function bigIntMax(...values: bigint[]): bigint {
    if (values.length === 0) return 0n
    return values.reduce((max, current) => (current > max ? current : max))
}

/**
 * Returns the minimum value among the given arguments, or 0n if no values are provided.
 * @throws {Error} If no arguments are provided.
 */
export function bigIntMin(...values: bigint[]): bigint {
    if (values.length === 0) return 0n
    return values.reduce((min, current) => (current < min ? current : min))
}

export type BigIntString = `#bigint.${string}`

/**
 * Converts a bigint into a lossless representation as a `#bigint.${number}` string.
 */
export function bigintToString(value: bigint): BigIntString {
    return `#bigint.${value}`
}

/**
 * Restores a bigint from its lossless representation as a `#bigint.${number}` string.
 */
export function stringToBigInt(value: BigIntString): bigint {
    return BigInt(value.slice(8))
}

export function isBigIntString(value: unknown): value is BigIntString {
    return typeof value === "string" && value.startsWith("#bigint.")
}
/**
 * Function to handle `bigint` lossless serialization
 */
export const bigIntReplacer = (_key: string, value: unknown): unknown => {
    return typeof value === "bigint" ? bigintToString(value) : value
}

/**
 * Function to handle `bigint` lossless deserialization
 */
export const bigIntReviver = (_key: string, value: unknown): unknown => {
    return isBigIntString(value) && value.startsWith("#bigint.") ? stringToBigInt(value) : value
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
export type BigIntSerialized<T> = RecursiveReplace<T, bigint, string>

/**
 * Utility functions that serializes `bigint` values into strings, returning a deep copy of the object
 * with all bigints replaced by their string representation (as accepted by `BigInt`, so no trailing "n").
 * If you supply {@link prefix}, it is prepended to the string representation.
 *
 * If you want to serialize to a JSON string, use {@link JSON.parse} and {@link JSON.stringify} along with {@link
 * bigIntReplacer} and {@link bigIntReviver} instead (those use a standard prefix to preserve bigint identity).
 */
export function serializeBigInt<T>(obj: T, prefix = ""): BigIntSerialized<T> {
    if (typeof obj === "bigint") {
        return (prefix + obj.toString()) as BigIntSerialized<T>
    } else if (Array.isArray(obj)) {
        return obj.map((item) => serializeBigInt(item)) as unknown as BigIntSerialized<T>
    } else if (obj !== null && typeof obj === "object") {
        const serializedObj = {} as Record<string, unknown>
        for (const key in obj) {
            if (hasOwnKey(obj, key)) serializedObj[key] = serializeBigInt(obj[key])
        }
        return serializedObj as BigIntSerialized<T>
    }
    return obj as BigIntSerialized<T>
}

/**
 * Retrieves the original version of an object serialized with {@link serializeBigInt}.
 * If a prefix is not provided, it attempts to parse every string into a bigint, replacing whenever that conversion
 * succeeds — this might not be what you want!
 */
export function deserializeBigInt<T>(obj: BigIntSerialized<T>, prefix = ""): T {
    return deserializeBigIntInternal(obj, prefix) as T
}

function deserializeBigIntInternal(obj: unknown, prefix: string): unknown {
    if (typeof obj === "string") {
        if (prefix) {
            return obj.startsWith(prefix) ? BigInt(obj.slice(prefix.length)).valueOf() : obj
        } else {
            try {
                return BigInt(obj)
            } catch {
                return obj
            }
        }
    } else if (Array.isArray(obj)) {
        return obj.map((item) => deserializeBigIntInternal(item, prefix))
    } else if (obj !== null && typeof obj === "object") {
        const deserialized = {} as Record<string, unknown>
        for (const key in obj) {
            if (hasOwnKey(obj, key)) deserialized[key] = serializeBigInt(obj[key])
        }
        return deserialized
    }
    return obj
}

/** Returns a parsed bigint from the input, or undefined if unable to parse. */
export function parseBigInt(input: string | undefined): bigint | undefined {
    try {
        return input ? BigInt(input) : undefined
    } catch {
        return undefined
    }
}
