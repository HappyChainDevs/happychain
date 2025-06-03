import { type Hex, parseBigInt, serializeBigInt } from "@happy.tech/common"
import { ArkErrors } from "arktype"
import { isProduction } from "#lib/env"

// Type helpers for handling serialized BigInt values
/**
 * Converts bigint properties to string in TypeScript types to match serialized values.
 * Handles nested objects and arrays recursively.
 */
export type SerializedBigInt<T> = T extends bigint
    ? string
    : T extends Array<infer U>
      ? Array<SerializedBigInt<U>>
      : T extends object
        ? SerializedObject<T>
        : T

/**
 * Converts all properties in an object that are bigint to string.
 * Used for type compatibility between runtime validation schemas and TypeScript interfaces.
 */
export type SerializedObject<T> = {
    [K in keyof T]: SerializedBigInt<T[K]>
}

export function isHexString(str: string): str is Hex {
    // The "0x" case won't parse as a bigint but is a valid zero-length hex string.
    return str.startsWith("0x") && (str === "0x" || (parseBigInt(str) ?? -1n) >= 0n)
}

export function validateOutput<T>(response: T, validator: (_: T) => ArkErrors | unknown): void {
    // Skip output validation in prod for performance & reliability.
    if (isProduction) return
    // we must use structuredClone here as arktype validators mutate the input object
    // and our boops are (mostly) immutable. changes to most fields would effect the computed hash
    const result = validator(structuredClone(response))
    if (result instanceof ArkErrors) result.throw()
}

/**
 * Serializes BigInt values in the response and then validates it against the schema.
 * This is a convenience function that combines serializeBigInt and validateOutput.
 *
 * @param response The response object to validate
 * @param validator The validation schema
 */
export function validateSerializedOutput<T>(
    response: T,
    validator: (serialized: unknown) => ArkErrors | unknown,
): void {
    // Skip output validation in prod for performance & reliability.
    if (isProduction) return

    // Serialize BigInt values to strings
    const serialized = serializeBigInt(response)

    // Validate the serialized output
    const result = validator(serialized)
    if (result instanceof ArkErrors) result.throw()
}
