export function createStorage<TSchema extends { [k: string]: unknown }>(prefix: string) {
    type Key = keyof TSchema

    return {
        get<Key extends keyof TSchema>(key: Key): TSchema[Key] | null {
            // Return type will depend on the key
            const data = localStorage.getItem(`${prefix}:${key as string}`)

            //type ReturnType = ???
            if (data !== null) {
                return JSON.parse(data) as TSchema[Key]
            }

            return null
        },

        set<T extends Key>(key: T, value: TSchema[T]) {
            localStorage.setItem(`${prefix}:${key as string}`, JSON.stringify(value))
        },

        remove(key: Key) {
            localStorage.removeItem(`${prefix}:${key as string}`)
        },

        clear() {
            localStorage.clear()
        },
    }
}
