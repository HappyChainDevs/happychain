export type Replacer = (key: string, value: unknown) => unknown
export type Reviver = (key: string, value: unknown) => unknown

export type StorageConfig = {
    prefix?: string
    replacer?: Replacer
    reviver?: Reviver
}

export function createStorage<TSchema extends { [k: string]: unknown }>(config: StorageConfig = {}) {
    const prefix = config.prefix ?? ""
    type Key = keyof TSchema
    const makeKey = (key: Key) => (prefix ? `${prefix}:${key as string}` : (key as string))

    return {
        get<Key extends keyof TSchema>(key: Key): TSchema[Key] | undefined {
            // Return type will depend on the key
            const data = localStorage.getItem(makeKey(key))
            if (data === "undefined") {
                return undefined
            }

            if (data !== null) {
                return JSON.parse(data, config.reviver) as TSchema[Key]
            }

            return undefined
        },

        set<T extends Key>(key: T, value: TSchema[T]) {
            localStorage.setItem(makeKey(key), JSON.stringify(value, config.replacer))
        },

        remove(key: Key) {
            localStorage.removeItem(makeKey(key))
        },

        clear() {
            localStorage.clear()
        },
    }
}
