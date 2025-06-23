import type { Prettify } from "../utils/types"
import type { NonRequiredKeys, OptionalKeys, RequiredKeys } from "./keys"

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
export type Override<T, O> = Prettify<
    // Required in O.
    & { [K in RequiredKeys<O>]: O[K] }

    // Required in T, not present in O.
    & { [K in Exclude<RequiredKeys<T>, keyof O>]: T[K] }

    // Optional in T, not present in O.
    & { [K in Exclude<OptionalKeys<T>, keyof O>]?: T[K] }

    // Not present in T, required in O — handled by first case.

    // Not present in T, optional in O.
    & { [K in Exclude<OptionalKeys<O>, keyof T>]?: O[K] }

    // Optional in both T and O.
    // We can't use Optional<O> here because <TypeScript type system reasons>.
    & { [K in OptionalKeys<T> & NonRequiredKeys<O>]?: T[K] | O[K] }

    // Required in both T and O — handled by the first case.

    // Required in T, optional in O.
    & { [K in RequiredKeys<T> & OptionalKeys<O>]: T[K] | O[K] }

    // Optional in T, required in O — handled by first case.
>

/**
 * A recursive version of {@link Override} that applies the same logic recursively at every level.
 *
 * The type handles recursive optionals corectly, essentially changing the type of a optional object property of type
 * `T` to `Partial<T>`, then proceeding with the override logic.
 *
 * Note that this operates only on proper objects, e.g. this does not "merge" array types (you can still end up with a
 * union of array types because of optional properties, but you will never end up with an array whose component type is
 * a union type that was not present in either of the original types).
 *
 * e.g. `Override<{ a: number, b: number, c: number }, { b: string, c?: string }>`
 * evaluates to `{ a: number, b: string, c?: number | string | undefined  }`
 */
// biome-ignore format: pretty
export type DeepOverride<T, O, OOptional = false> =
    O extends Record<string, unknown>
        ? DeepOverrideInternal<T, O> // TODO test
        : (OOptional extends true ? T | O : O)

// biome-ignore format: pretty
type DeepOverrideInternal<T, O> = Prettify<
    // Required in T, not present in O.
    & { [K in Exclude<RequiredKeys<T>, keyof O>]: T[K] }

    // Optional in T, not present in O.
    & { [K in Exclude<OptionalKeys<T>, keyof O>]?: T[K] }

    // Not present in T, required in O.
    & { [K in Exclude<RequiredKeys<O>, keyof T>]: O[K] }

    // Not present in T, optional in O.
    & { [K in Exclude<OptionalKeys<O>, keyof T>]?: O[K] }

    // Required in both T and O.
    & { [K in RequiredKeys<T> & RequiredKeys<O>]: DeepOverride<T[K], O[K]>}

    // Optional in both T and O.
    // We can't use Optional<O> here because <TypeScript type system reasons>.
    & { [K in OptionalKeys<T> & NonRequiredKeys<O>]?: DeepOverride<OptProp<T[K]>, OptProp<O[K]>, true> }

    // Required in T, optional in O.
    & { [K in RequiredKeys<T> & OptionalKeys<O>]: DeepOverride<T[K], OptProp<O[K]>, true> }

    // Optional in T, required in O.
    & { [K in OptionalKeys<T> & RequiredKeys<O>]: DeepOverride<OptProp<T[K]>, O[K]> }
>

// biome-ignore format: pretty
type OptProp<T> = T extends Record<string, unknown>
    ? Partial<Exclude<T, undefined>>
    : Exclude<T, undefined>
