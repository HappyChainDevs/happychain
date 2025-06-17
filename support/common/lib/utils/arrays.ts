/**
 * Returns an array with the given elements, with undefined and null elements removed.
 *
 * Besides use as a constructor, it's also suitable to:
 * - filter out undefined/null elements from an existing array: `array(...myArray)`
 * - include an element in an array only if it is defined: `[1, ...array(nullOrNumber)]`
 */
export function array<T>(...array: (T | undefined | null)[]): T[] {
    return array.filter((it) => it !== undefined && it !== null)
}

/** Returns a copy of the array with duplicate items removed. */
export function uniques<T>(array: T[]): T[] {
    return [...new Set(array)]
}

/** Returns the last item in the array. */
export function last<T>(array: T[]): T {
    return array[array.length - 1]
}
