/**
 * A function that can be passed to {@link Array.filter} and co. to remove duplicate elements.
 */
export function onlyUnique<T>(value: T, index: number, array: T[]): boolean {
    return array.indexOf(value) === index
}
