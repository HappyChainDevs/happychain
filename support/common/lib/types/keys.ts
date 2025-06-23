/**
 * Extract all keys from an object, but also works on union of objects, basically what you think `keyof Union` would do,
 * but doesn't.
 */
export type Keys<T> = T extends unknown ? keyof T : never

/**
 * Returns an union of the optional keys of `T`.
 *
 * The type works well for inference on concrete types but struggles with type bounds. In particular, TS sometimes
 * struggles with multiple of this type and/or {@link RequiredKeys} (the precise conditions being mysterious to me). In
 * those cases, using the alternative type {@link NonRequiredKeys} often works.
 */
export type OptionalKeys<T> = {
    // biome-ignore lint/complexity/noBannedTypes: we need to represent the empty object
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

/**
 * Returns an union of the optional keys of `T`.
 *
 * The type works well for inference on concrete types but struggles with type bounds. In particular, TS sometimes
 * struggles with multiple of this type and/or {@link OptionalKeys} (the precise conditions being mysterious to me). In
 * those cases, using the alternative type {@link NonOptionalKeys} often works.
 */
export type RequiredKeys<T> = {
    // biome-ignore lint/complexity/noBannedTypes: we need to represent the empty object
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

/**
 * Alternative to {@link RequiredKeys}, to be used when the TS type system has trouble mixing multiple instantiations of
 * {@link OptionalKeys} and/or {@link RequiredKeys}.
 */
export type NonOptionalKeys<T> = Exclude<keyof T, OptionalKeys<T>>

/**
 * Alternative to {@link OptionalKeys}, to be used when the TS type system has trouble mixing multiple instantiations of
 * {@link OptionalKeys} and/or {@link RequiredKeys}.
 */
export type NonRequiredKeys<T> = Exclude<keyof T, RequiredKeys<T>>
