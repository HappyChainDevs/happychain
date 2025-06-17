// === COMMON TYPES ================================================================================

/** Type of http or https strings, starting with the proper protocol. */
export type HTTPString = `http://${string}` | `https://${string}`

/** Type predicate / assertion for {@link HTTPString}. */
export function isHttpString(string: string | undefined): string is HTTPString {
    return !!string && (string.startsWith("http://") || string.startsWith("https://"))
}

/** Type of hexadecimal strings prefixed with 0x. */
export type Hex = `0x${string}`

/** Type of hexadecimal wallet addresses prefixed with 0x. */
export type Address = `0x${string}`

/** A hash, as hex-encoded data. (0x-prefixed string). */
export type Hash = `0x${string}`

/**
 * Type shorthand for `null | undefined`.
 */
export type Nullish = null | undefined

/**
 * Type for any value that is not undefined. Very useful as a type bound.
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type NotUndefined = {} | null

/**
 * Type for any value that is not null. Very useful as a type bound.
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type NotNull = {} | undefined

/**
 * Type for any value that is not undefined or null. Very useful as a type bound.
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type Defined = {}

/**
 * Type guard shorthand for `value !== null && value !== undefined`
 */
export function isDef(value: unknown): value is Defined {
    return value !== null && value !== undefined
}

/**
 * Type guard shorthand for `value === null || value === undefined`.
 */
export function isNullish(value: unknown): value is null | undefined {
    return value === null || value === undefined
}

// === Solidity Type Mappings ================================================================================

export type UInt256 = bigint
export type UInt192 = bigint
export type UInt160 = bigint
export type UInt128 = bigint
export type UInt96 = bigint
export type UInt64 = bigint
export type UInt32 = number
export type UInt16 = number
export type UInt8 = number

export type Int256 = bigint
export type Int192 = bigint
export type Int160 = bigint
export type Int128 = bigint
export type Int96 = bigint
export type Int64 = bigint
export type Int32 = number
export type Int16 = number
export type Int8 = number

export type Bytes = Hex

// === TYPE ASSERTIONS =============================================================================

/**
 * Asserts that `_A` is assignable to `_B`.
 *
 * @example
 * ```ts twoslash
 * type _assert1 = AssertAssignableTo<"test", string> // okay
 * type _assert2 = AssertAssignableTo<string, "test"> // error
 * ```
 */
export type AssertAssignableTo<_A extends _B, _B> = never

/**
 * Asserts that `A` and `B` are mutually assignable.
 *
 * @example
 * ```ts twoslash
 * type _assert1 = AssertCompatible<{ a: string, b?: string }, { a: string }> // okay
 * type _assert2 = AssertCompatible<{ a: string, b?: string }, { a: string, b: string }> // error
 * ```
 */
export type AssertCompatible<A extends B, B extends C, C = A> = never

// === TYPE FUNCTIONS ==============================================================================

/**
 * Merges object definitions within a type intersection.
 *
 * e.g. `Prettify<{ a: string } & { b: number }>` evaluates to `{ a: string, b: number }`.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

/**
 * Returns the types of the values of T (where T is an object).
 */
export type Values<T> = T[keyof T]

/**
 * A version of `Base` with `OptionalKeys` made optional.
 *
 * e.g. `Optional<{ a: string, b: number }, "b">` evaluates to `{ a: string, b?: number }`.
 */
export type Optional<Base, OptionalKeys extends keyof Base> = Prettify<
    Omit<Base, OptionalKeys> & Partial<Pick<Base, OptionalKeys>>
>

/**
 * Returns the array type that matches all possible permutations of the input disjunction type `T`.
 * Note this has combinatorial complexity.
 *
 * @example
 * ```ts twoslash
 * type Disjunction = "a" | "b"
 * type DisjunctionArray = TupleUnion<Disjunction>
 * type _assert = AssertCompatible<DisjunctionArray, ["a", "b"] | ["b", "a"]>
 * ```
 */
// biome-ignore format: readability
export type TupleUnion<T, K = T> =
    [T] extends [never]
        ? []
        : K extends T
            ? [K, ...TupleUnion<Exclude<T, K>>]
            : never

/**
 * Converts an union type into a tuple type, e.g. `A | B | C` becomes `[A, B, C]`.
 * The order of type arguments is NOT guaranteed, but generally preserved.
 */
// Adapted from https://stackoverflow.com/a/55858763/298664
// Read here to understand some of the dark magic: https://gist.github.com/norswap/37f7dd715a986d0ce163b8d07bbe289a
// biome-ignore format: readability
export type UnionToTuple<Union> =
    [Union] extends [never]
        ? []
        : Select<Union> extends infer Member
            ? [...UnionToTuple<Exclude<Union, Member>>, Member]
            : never

/**
 * Given an union U, selects one of its members. This is *generally* the
 * last one, but sometimes it does weird things, e.g. `Select<1|2|3> == 2`.
 */
export type Select<U> = ReturnOf<InferAsArg<RetFunc<U>>>

type RetFunc<T> = T extends never ? never : () => T
type ArgFunc<T> = T extends never ? never : (_: T) => void
type ReturnOf<T> = T extends () => infer R ? R : never
type InferAsArg<T> = ArgFunc<T> extends (_: infer A) => void ? A : never

/**
 * Given the type of a tuple of keys (`KeyTuple`) and a type whose keys are a superset of the keys
 * in the tuple (`Mapping`), returns a tuple of the value types in `Mapping` for each corresponding
 * key.
 *
 * e.g. `MapTuple<["a", "b"], { a: number, b: string, c: boolean }>` evaluates to `[number, string]`.
 *
 * This combines well with {@link UnionToTuple}, which can be used to get a tuple of keys from the
 * any type union, in particular from the value types of a record (e.g. `MyRecord[keyof MyRecord]`).
 */
// biome-ignore format: readability
export type MapTuple<KeyTuple extends readonly (keyof Mapping)[], Mapping> =
    KeyTuple extends readonly [
          infer First extends keyof Mapping,
          ...infer Rest extends readonly (keyof Mapping)[],
      ]
          ? [Mapping[First], ...MapTuple<Rest, Mapping>]
          : []

/**
 * Given a tuple of key types, and a tuple of value types, produces an object type that maps
 * each key to the corresponding value. If the tuples have different size, the resulting type
 * will only have as many entries as the shortest tuple.
 *
 * e.g. `ObjectFromTuples<["a", "b"], [number, string, boolean]>` evaluates to `{ a: number, b: string }`.
 *
 * This combines well with {@link UnionToTuple}, which can be used to get a tuple of keys from the
 * any type union, in particular from the value types of a record (e.g. `MyRecord[keyof MyRecord]`).
 */
// biome-ignore format: readability
export type ObjectFromTuples<KeyTuple extends PropertyKey[], ValueTuple extends unknown[]> = Prettify<
    KeyTuple extends [
        infer FirstKey extends PropertyKey,
        ...infer RestKeys extends PropertyKey[]
    ]
        ? ValueTuple extends [
            infer FirstValue,
            ...infer RestValues,
        ]
            ? { [key in FirstKey]: FirstValue } & ObjectFromTuples<RestKeys, RestValues>
            : Record<never, never>
      : Record<never, never>
>

/**
 * Returns a version of `T` where all fields of type `Src` have been replaced by a field of type `Dst`, recursively.
 */
export type RecursiveReplace<T, Src, Dst> = Prettify<{
    [K in keyof T]: T[K] extends Src ? Dst : T[K] extends object ? RecursiveReplace<T[K], Src, Dst> : T[K]
}>

type OptionalKeys<T extends object> = {
    // biome-ignore lint/complexity/noBannedTypes: we need it
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>

/**
 * Returns a type that has all properties in both `T` and `O`, with the value type from `O` for the common properties
 * that are not optional in `O`, and the union of the value types from `O` and `T` for common properties that are
 * optional in `O`. Without entering into the details, optionality on the resulting keys is correct.
 *
 * Another way to think about this is that this correctly types `a` in `Object.assign(a, b)` after the assignment is
 * done.
 *
 * e.g. `Override<{ a: number, b: number, c: number }, { b: string, c?: string }>`
 * evaluates to `{ a: number, b: string, c?: number | string | undefined  }`
 */
// biome-ignore format: pretty
export type Override<T extends object, O extends object> = Prettify<
    & { [K in Exclude<RequiredKeys<T>, keyof O>]: T[K] }
    & { [K in Exclude<OptionalKeys<T>, keyof O>]?: T[K] }
    & { [K in OptionalKeys<O> & RequiredKeys<T>]: T[K] | O[K] }
    // We'd rather have written `K in OptionalKey<T> & OptionalKeys<O>` but it somehow doesn't work.
    & { [K in OptionalKeys<O> & Exclude<keyof T, RequiredKeys<T>>]?: T[K] | O[K] }
    & { [K in Exclude<keyof O, keyof T & OptionalKeys<O>>]: O[K] }
>

/** Extract all keys from a union of objects. */
export type AllKeys<Union> = Union extends unknown ? keyof Union : never

/**
 * Distributes the types in an union.
 *
 * e.g. `Distribute<{ a: 1, b: 2 } | { a: 3, b: 4 }>` evaluates to `{ a: 1 | 3, b: 2 | 4 }`
 */
export type Distribute<T> = {
    [K in AllKeys<T>]: T extends Record<K, infer U> ? U : never
}

/**
 * Returns a copy of an union of objects, where each object is augmented with the
 * optional undefined-typed keys from the other objects that it does not have itself.
 *
 * e.g. `UnionFill<{ a: string } | { b: string }>` evaluates to
 * `{ a: string, b?: undefined } | { a?: undefined, b: string }`
 */
// biome-ignore format: pretty
export type UnionFill<Union, Original = Union> = Prettify<
    [Union] extends [never]
        ? never
        : Select<Union> extends infer Member
            ? | ( & { [K in Exclude<AllKeys<Original>, keyof Member>]?: undefined }
                  & { [K in keyof Member]: Member[K] } )
              | UnionFill<Exclude<Union, Member>, Original>
            : never
>
