import { type Hex, parseBigInt } from "@happy.tech/common"
import { ArkErrors } from "arktype"
import { isProduction } from "#lib/env"

export function isHexString(str: string): str is Hex {
    // The "0x" case won't parse as a bigint but is a valid zero-length hex string.
    return str.startsWith("0x") && (str === "0x" || (parseBigInt(str) ?? -1n) >= 0n)
}

export function validateOutput<T>(response: T, validator: (_: T) => ArkErrors | unknown): void {
    // Skip output validation in prod for performance & reliability.
    if (isProduction) return
    const result = validator(response)
    if (result instanceof ArkErrors) result.throw()
}
