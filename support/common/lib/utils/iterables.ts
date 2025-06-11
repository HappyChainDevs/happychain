import type { NotUndefined } from "./types"

/**
 * Partitions the iterable into two arrays: the first holds the items for which the predicate
 * is true, the second the items for which it is false.
 */
export function binaryPartition<T>(array: Iterable<T>, predicate: (item: T) => boolean): [T[], T[]] {
    const output: [T[], T[]] = [[], []]
    for (const item of array) output[predicate(item) ? 0 : 1].push(item)
    return output
}

/**
 * Partitions the iterable into multiple arrays based on the label returned by the provided
 * {@link getLabel} function. The labels serves as key in the returned object, and the values
 * are the list of items matching the label (or undefined if no objects match the label).
 */
export function partition<T, Label extends string = string>(
    array: Iterable<T>,
    getLabel: (item: T) => Label,
): Record<Label, T[]> {
    const output = {} as Record<Label, T[]>
    for (const item of array) {
        const label = getLabel(item)
        if (!output[label]) output[label] = []
        output[label].push(item)
    }
    return output
}

/**
 * This is semantically equivalent to `[...iterable].filter(it => !!fn(it)).map(fn)` — it maps the iterable to an array
 * using `fn` but excludes undefined values.
 *
 * It improves on the formulation above by performing a single iteration over the iterable instead of 3.
 */
export function filterMap<T, U extends NotUndefined>(iterable: Iterable<T>, fn: (item: T) => U | undefined): U[] {
    const result: U[] = []
    for (const item of iterable) {
        const transformed = fn(item)
        if (transformed !== undefined) result.push(transformed)
    }
    return result
}
