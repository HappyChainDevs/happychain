// Utility type to transform all bigint fields to string
type ReplaceBigIntWithString<T> = {
    [K in keyof T]: T[K] extends bigint ? string : T[K] extends object ? ReplaceBigIntWithString<T[K]> : T[K]
}

type Prettify<T> = { [K in keyof T]: T[K] } & {}

// Utility functions to serialize and deserialize bigint values
export function serializeBigInt<T>(obj: T): Prettify<ReplaceBigIntWithString<T>> {
    if (typeof obj === "bigint") {
        return obj.toString() as ReplaceBigIntWithString<T>
    } else if (Array.isArray(obj)) {
        return obj.map((item) => serializeBigInt(item)) as unknown as ReplaceBigIntWithString<T>
    } else if (obj !== null && typeof obj === "object") {
        const serializedObj = {} as Record<string, unknown>
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                serializedObj[key] = serializeBigInt((obj as T)[key])
            }
        }
        return serializedObj as ReplaceBigIntWithString<T>
    }
    return obj as ReplaceBigIntWithString<T>
}
