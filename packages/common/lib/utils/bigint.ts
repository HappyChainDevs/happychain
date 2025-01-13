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
