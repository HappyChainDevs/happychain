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

export function atomWithCompareAndStorage<Value>(
    key: string,
    initialValue: Value,
    areEqual: (prev: Value, next: Value) => boolean,
) {
    // https://jotai.org/docs/guides/persistence
    const getInitialValue = () => {
        const item = localStorage.getItem(key)
        if (item !== null) {
            return JSON.parse(item)
        }
        return initialValue
    }

    const resolvedInitialValue = getInitialValue()

    return atomWithReducer(resolvedInitialValue, (prev: Value, next: Value) => {
        if (areEqual(prev, next)) {
            return prev
        }

        if (next === undefined) {
            localStorage.removeItem(key)
        } else {
            localStorage.setItem(key, JSON.stringify(next))
        }
        return next
    })
}
