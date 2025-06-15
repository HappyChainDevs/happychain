type TypeMap = {
    boolean: boolean
    number: number
    string: string
    bigint: bigint
    symbol: symbol
    object: object
    function: (...args: unknown[]) => unknown
    undefined: undefined
    null: null
    array: unknown[]
}

/**
 * Type guard to check that the value is an object with the given property key, and optionally with the given
 * property type. If the optional {@link own} is passed as true, this will only check the object's own properties.
 *
 * Valid values for {@link type} are the valid return values of the `typeof` operator, plus "null" and "array".
 *
 * Unlike `typeof`, a type of "object" will only match if the value is not null.
 *
 * Note that if the type is not specified, this can return true for properties with null or undefined value.
 * To avoid this, use {@link hasDefinedKey} instead.
 */
export function hasKey<K extends string, V extends keyof TypeMap>(
    value: unknown,
    key: K,
    type?: V,
    own?: boolean,
): value is { [k in K]: TypeMap[V] } {
    const keyPresent = typeof value === "object" && value !== null && (own ? Object.hasOwn(value, key) : key in value)
    if (keyPresent && type) {
        // biome-ignore lint/suspicious/noExplicitAny: needed for access
        // biome-ignore lint/suspicious/useValidTypeof: needed for check
        const propValue = (value as any)[key]
        const actualType = typeof propValue
        if (actualType === "object") {
            return type === "null"
                ? propValue === null
                : type === "array"
                  ? Array.isArray(propValue)
                  : type === "object"
        }
        return actualType === type
    }
    return keyPresent
}

/**
 * Syntactic convenient for calling {@link hasOwn} with the `own` parameter
 * set as true — meaning it will only lookup the object's own properties.
 */
export function hasOwnKey<K extends string, V extends keyof TypeMap>(
    value: unknown,
    key: K,
    type?: V,
): value is { [k in K]: TypeMap[V] } {
    return hasKey(value, key, type, true)
}

/**
 * Type guard to check that the value is an object with the given property key whose
 * value is not null or undefined, and optionally with the given property type.
 *
 * Valid values for {@link type} are the valid return values of the `typeof` operator, minus "undefined".
 */
export function hasDefinedKey<K extends string, V extends keyof Exclude<TypeMap, "undefined" | "null">>(
    value: unknown,
    key: K,
    type?: V,
): value is { [k in K]: TypeMap[V] } {
    return hasKey(value, key, type) && value[key] !== null && value[key] !== undefined
}

/**
 * Returns the value of the given property (key) in the passed value, only if the passed value is an object
 * with the given key and optionally with the given type, otherwise returns undefined.
 *
 * Valid values for {@link type} are the valid return values of the `typeof`
 * operator, minus "undefined" (which would be ambiguous), plus "null".
 *
 * Note that if the type is not specified, this can return property values which are null or undefined.
 */
export function getProp<K extends string, V extends keyof Exclude<TypeMap, "undefined">>(
    value: unknown,
    key: K,
    type?: V,
): TypeMap[V] | undefined {
    return hasKey(value, key, type) ? value[key] : undefined
}

/**
 * Takes a possibly undefined or null value and a function, and returns the result of applying the function to the
 * value if the value is not undefined. If more parameters are passed, they are passed along to to the function.
 *
 * Example: `ifDef(myHexString, Number.parseInt, 16)` which is equivalent
 * to `(myHexString !== undefined && myHexString !== null) ? Number.parseInt(myHexString, 16) : undefined`.
 */
export function ifDef<T, R, Rest extends unknown[]>(
    value: T | undefined | null,
    f: (arg: T, ...rest: Rest) => R,
    ...rest: Rest
): R | undefined {
    return value !== undefined && value !== null ? f(value, ...rest) : undefined
}

/**
 * Returns true iff the passed object has no enumerable properties and it has the same prototype as `{}`.
 *
 * For efficiency, this does not check for non-enumerable properties, unless you pass "strict" as the second argument.
 */
export function isEmpty(obj: object, strict?: "strict"): boolean {
    if (Object.getPrototypeOf(obj) !== Object.getPrototypeOf({})) return false
    if (strict) {
        return Object.getOwnPropertyNames(obj).length === 0
    } else {
        for (const _ in obj) return false
        return true
    }
}

/**
 * Picks the given keys from the object.
 *
 * e.g. `pick({ a: 1, b: 2, c: 3 }, "a", "b")` returns `{ a: 1, b: 2 }`
 */
export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>
    for (const key of keys) result[key] = obj[key]
    return result
}
