export class AssertionError extends Error {}

/**
 * Asserts that {@link value} is defined: not null nor undefined.
 */
export function assertDef<T>(value: T): asserts value is Exclude<T, null | undefined> {
    if (value === undefined || value === null) throw new AssertionError(`value is ${value}`)
}

/**
 * Fully generic assertion that {@link value} has type T.
 * WARNING: This is not checked at runtime.
 */
export function assertType<T>(value: unknown): asserts value is T {}
