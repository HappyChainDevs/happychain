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

/** A version of `Base` with `OptionalKeys` made optional. */
// biome-ignore format: readability
export type Optional<Base, OptionalKeys extends keyof Base>
    = Omit<Base, OptionalKeys> & Partial<Pick<Base, OptionalKeys>>

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
export type TupleUnion<T, K = T> = [T] extends [never]
    ? []
    : K extends T
        ? [K, ...TupleUnion<Exclude<T, K>>]
        : never

/**
 * Helper for {@link UnionToTuple}. No idea how this work, but trying to get rid of it results
 * in "Type instantiation is excessively deep and possibly infinite". It seems like the extra
 * never check in crucial for the recursion to work.
 */
// biome-ignore format: readability
type UnionToTupleHelper<F> =
    (F extends never ? never : (arg: F) => never) extends (arg: infer I) => void
        ? I
        : never

/**
 * Converts an union type into a tuple type, e.g. `A | B | C` becomes `[A, B, C]`.
 * The order of type arguments is respected.
 *
 * Lifted from https://stackoverflow.com/a/55858763/298664
 */
// biome-ignore format: readability
export type UnionToTuple<U> =
    UnionToTupleHelper<
        U extends never ? never : (arg: U) => U
    > extends (_: never) => infer W
        ? [...UnionToTuple<Exclude<U, W>>, W]
        : []

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
