/**
 * Returns an anonymous class that declares the fields in the type param `Fields`.
 *
 * This is useful when you want a class to extend say an interface but don't want to redeclare all the fields manually.
 *
 * Example:
 * ```
 * class Myclass extends With<{ a: string }>() {
 * ...
 * foo() { console.log(this.a) }
 * }
 * ```
 */
/*@__NO_SIDE_EFFECTS__*/
export function With<Fields extends Record<string, unknown>>() {
    return class {} as new () => Fields
}
