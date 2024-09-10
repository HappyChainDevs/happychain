/**
 * Asserts that `_B` is assignable to `_B`.
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
