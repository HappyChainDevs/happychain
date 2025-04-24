import { bigIntReplacer } from "./bigint"
import { hasKey } from "./objects"

/**
 * Returns the best stringification of the value. This will be the same as `String(value)`, unless the value is an
 * object, in which case it calls `toString()` if defined and not returning `[object Object]`, otherwise it invokes
 * `JSON.stringify` on the object, with a bigint replace that serializes bigints as strings with a leading "#bigint.".
 */
export function stringify(value: unknown): string {
    if (typeof value === "object") {
        if (hasKey(value, "toString", "function")) {
            const string = value.toString()
            return string !== "[object Object]" ? string : JSON.stringify(value, bigIntReplacer)
        }
    }
    return String(value)
}
