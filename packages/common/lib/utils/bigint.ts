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
