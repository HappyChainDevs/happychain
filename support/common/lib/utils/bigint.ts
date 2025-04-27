import type { Prettify } from "viem"

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
 * Converts a bigint to a zero-padded string
 */
export function bigIntToZeroPadded(value: bigint, totalDigits: number): string {
    const str = value.toString()
    return str.padStart(totalDigits, "0")
}

// Utility type to transform all bigint fields to string
type ReplaceBigIntWithString<T> = Prettify<{
    [K in keyof T]: T[K] extends bigint ? string : T[K] extends object ? ReplaceBigIntWithString<T[K]> : T[K]
}>

/**
 * Utility functions to serialize and deserialize bigint values
 */
export function serializeBigInt<T>(obj: T): ReplaceBigIntWithString<T> {
    if (typeof obj === "bigint") {
        return obj.toString() as ReplaceBigIntWithString<T>
    } else if (Array.isArray(obj)) {
        return obj.map((item) => serializeBigInt(item)) as unknown as ReplaceBigIntWithString<T>
    } else if (obj !== null && typeof obj === "object") {
        const serializedObj = {} as Record<string, unknown>
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                serializedObj[key] = serializeBigInt((obj as T)[key])
            }
        }
        return serializedObj as ReplaceBigIntWithString<T>
    }
    return obj as ReplaceBigIntWithString<T>
}
