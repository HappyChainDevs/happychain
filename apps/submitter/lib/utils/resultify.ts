import { type Result, err, ok } from "neverthrow"

/**
 * If {@link thing} is undefined or null, returns an `undefined` error. If it is a function a function, returns an ok
 * result of the function's return value (even if undefined or null). Otherwise, returns an ok result of {@link thing}.
 */
export function resultify<T>(thing: (() => T) | T | null | undefined): Result<T, unknown> {
    try {
        if (thing === undefined || thing === null) return err(undefined)
        if (typeof thing === "function") return ok((thing as () => T)())
        return ok(thing)
    } catch (error) {
        return err(error)
    }
}

/**
 * Executes {@link f}, wrapping its return in a result which passes any thrown error as an error result.
 */
export async function resultifyAsync<T>(f: Promise<T> | (() => Promise<T>)): Promise<Result<T, unknown>> {
    try {
        return ok(await (typeof f === "function" ? (f as () => Promise<T>)() : f))
    } catch (error) {
        return err(error)
    }
}
