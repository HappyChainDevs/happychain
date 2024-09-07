/**
 * Asserts that `_T` is assignable to `_U`.
 *
 * Usage: type _assertion = AssertAssignableTo<A, B>
 * This line will refuse to compile if A is not assignable to B.
 */
export type AssertAssignableTo<_T extends _U, _U> = never
