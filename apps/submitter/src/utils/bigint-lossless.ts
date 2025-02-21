// Utility type to transform all bigint fields to string
type ReplaceBigIntWithString<T> = {
    [K in keyof T]: T[K] extends bigint
        ? `#bigint.${string}`
        : T[K] extends object
          ? ReplaceBigIntWithString<T[K]>
          : T[K]
}

// Reverse (string => bigint)
type ReplaceStringWithBigInt<T> = {
    [K in keyof T]: T[K] extends `#bigint.${string}`
        ? bigint
        : T[K] extends object
          ? ReplaceStringWithBigInt<T[K]>
          : T[K]
}

type Prettify<T> = { [K in keyof T]: T[K] } & {}

// Utility functions to serialize and deserialize bigint values
export function serializeBigInt<T>(obj: T): Prettify<ReplaceBigIntWithString<T>> {
    if (typeof obj === "bigint") {
        return ("#bigint." + obj.toString()) as ReplaceBigIntWithString<T>
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

const isSerializedBigInt = (str: unknown): str is `#bigint.${string}` =>
    typeof str === "string" && (str as string).startsWith("#bigint.")

export function deserializeBigInt<T>(obj: ReplaceBigIntWithString<T>): Prettify<ReplaceStringWithBigInt<T>> {
    if (isSerializedBigInt(obj)) {
        return BigInt(obj.replace("#bigint.", "")) as unknown as ReplaceStringWithBigInt<T>
    } else if (Array.isArray(obj)) {
        return obj.map((item) => deserializeBigInt(item)) as unknown as ReplaceStringWithBigInt<T>
    } else if (obj !== null && typeof obj === "object") {
        const deserializedObj = {} as Record<string, unknown>
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                deserializedObj[key] = deserializeBigInt((obj as any)[key])
            }
        }
        return deserializedObj as ReplaceStringWithBigInt<T>
    }
    return obj as ReplaceStringWithBigInt<T>
}
