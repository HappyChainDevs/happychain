import { atomWithReducer, createJSONStorage } from "jotai/utils"
import { type Atom, type WritableAtom, getDefaultStore } from "jotai/vanilla"
import { bigIntReplacer, bigIntReviver } from "./bigint"

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

type AtomValue<TAtom> = TAtom extends Atom<infer U> ? U : never

function atomIsWriteable<TValue, TAtom extends Atom<TValue>>(
    atom: unknown,
): atom is WritableAtom<AtomValue<TAtom>, AtomValue<TAtom>[], void> {
    return Boolean(atom && typeof atom === "object" && "read" in atom && "write" in atom)
}

function isCallback<T>(value: T | unknown): value is T {
    return typeof value === "function"
}

/**
 * Creates vanillaJS setters and getters for the provided atom
 *
 * @param atom
 * @returns 'react like' hook factory for vanilla-js
 */
export function accessorsFromAtom<TValue, TAtom extends Atom<TValue>>(atom: TAtom) {
    const store = getDefaultStore()
    return {
        getValue: (): AtomValue<TAtom> => store.get(atom) as AtomValue<TAtom>,
        setValue: (next: AtomValue<TAtom> | ((n: AtomValue<TAtom>) => AtomValue<TAtom>)): void => {
            if (!atomIsWriteable<TValue, TAtom>(atom)) {
                throw new Error("Atom is not writeable")
            }

            if (isCallback<(n: AtomValue<TAtom>) => AtomValue<TAtom>>(next)) {
                store.set(atom, next(store.get(atom)))
            } else {
                store.set(atom, next)
            }
        },
    }
}

/**
 * Utility function to create a JSON storage with custom handling of `bigint` values.
 * - BigInt values are stringified during storage and restored upon retrieval using a custom replacer and reviver.
 * - This utility can be used for any atom that stores data containing `bigint`.
 */
export const createBigIntStorage = <T>() =>
    createJSONStorage<T>(() => localStorage, {
        replacer: bigIntReplacer,
        reviver: bigIntReviver,
    })
