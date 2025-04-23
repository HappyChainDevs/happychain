export type Result<T, E> = Ok<T, E> | Err<T, E>

/**
 * Contains either a value of type `T` or an error of type `E`.
 */
export interface ResultInterface<T, E> {
    /**
     * Returns true only if this contains a value and allows safe access to the value via
     * `result.value`.
     */
    isOk(): this is Ok<T, E>

    /**
     * Returns true only if this contains an error and allows safe access to the value via
     * `result.error`.
     */
    isErr(): this is Err<T, E>

    /**
     * Returns the value if this contains a value, or throws the error.
     * @throws E
     */
    unwrap(): T
}

export class Ok<T, E> implements ResultInterface<T, E> {
    constructor(public readonly value: T) {}
    isOk(): this is Ok<T, E> {
        return true
    }
    isErr(): this is Err<T, E> {
        return false
    }
    unwrap(): T {
        return this.value
    }
}

export class Err<T, E> implements ResultInterface<T, E> {
    constructor(public readonly error: E) {}
    isOk(): this is Ok<T, E> {
        return false
    }
    isErr(): this is Err<T, E> {
        return true
    }
    unwrap(): T {
        throw this.error
    }
}

/** Constructs a {@link Result} containing a value. */
export const ok = <T, E>(value: T): Result<T, E> => new Ok(value)

/** Constructs a {@link Result} containing an error. */
export const err = <T, E>(error: E): Result<T, E> => new Err(error)
