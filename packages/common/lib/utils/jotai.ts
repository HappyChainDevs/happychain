import { atomWithReducer } from 'jotai/utils'

/**
 * https://jotai.org/docs/recipes/atom-with-compare
 *
 * only triggers update when the areEqual predicate returns false
 */
export function atomWithCompare<Value>(initialValue: Value, areEqual: (prev: Value, next: Value) => boolean) {
    return atomWithReducer(initialValue, (prev: Value, next: Value) => {
        if (areEqual(prev, next)) {
            return prev
        }
        return next
    })
}
