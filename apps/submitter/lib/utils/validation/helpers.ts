import { type Hex, parseBigInt } from "@happy.tech/common"
import { ArkErrors } from "arktype"
import { isProduction } from "#lib/env"

export function isHexString(str: string): str is Hex {
    // The "0x" case won't parse as a bigint but is a valid zero-length hex string.
    return str.startsWith("0x") && (str === "0x" || (parseBigInt(str) ?? -1n) >= 0n)
}

/**
 * Validates the output against a schema and throws a formatted error if validation fails.
 *
 * @param response The response object to validate
 * @param validator The validation schema
 * @param context Optional context name to include in error messages
 */
export function validateOutput<T>(response: T, validator: (_: T) => ArkErrors | unknown, context?: string): void {
    // Skip output validation in prod for performance & reliability.
    if (isProduction) return

    // We must use structuredClone here as arktype validators mutate the input object
    // and our boops are (mostly) immutable. changes to most fields would affect the computed hash
    const result = validator(structuredClone(response))

    if (result instanceof ArkErrors) {
        // Extract a more user-friendly error message from ArkErrors
        const errorMessage = formatValidationError(result, context)
        throw new Error(errorMessage)
    }
}

/**
 * Formats an ArkErrors instance into a user-friendly error message
 *
 * @param error The ArkErrors instance
 * @param context Optional context name to include in error messages
 * @returns A formatted error message string
 */
function formatValidationError(error: ArkErrors, context?: string): string {
    // Get the error message from toString() but clean it up
    const errorString = error.toString()

    // Extract the main error message (remove the stack trace if present)
    const mainError = errorString.split("\n")[0].trim()

    // Try to extract path information if available
    const pathMatch = errorString.match(/at path ['"]([^'"]+)['"]/)
    const pathInfo = pathMatch ? ` at path '${pathMatch[1]}'` : ""

    // Try to extract expected/received information
    const expectedMatch = errorString.match(/expected ([^,]+)/)
    const receivedMatch = errorString.match(/received ([^,\n]+)/)

    const expectedInfo = expectedMatch ? `, expected: ${expectedMatch[1]}` : ""
    const receivedInfo = receivedMatch ? `, received: ${receivedMatch[1]}` : ""

    // Include context if provided
    const contextInfo = context ? ` in ${context}` : ""

    return `Validation Error${contextInfo}: ${mainError}${pathInfo}${expectedInfo}${receivedInfo}`
}
