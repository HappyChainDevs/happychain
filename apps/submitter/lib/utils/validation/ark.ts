import type { Hex } from "@happy.tech/common"
import { type Traversal, type Type, type } from "arktype"
import { resolver } from "hono-openapi/arktype"
import { checksum } from "ox/Address"

// =====================================================================================================================
// METADATA

declare global {
    interface ArkEnv {
        meta(): {
            example?: unknown
        }
    }
}

// =====================================================================================================================
// HELPERS

export function openApiContent(schema: Type<unknown>) {
    return { "application/json": { schema: resolver(schema) } }
}

/**
 * Parse a string to a bigint, with strict validation.
 * Expected format: Plain number strings without 'n' suffix (e.g., "123", "-456", "0")
 *
 * @param input A string representation of a BigInt value
 * @returns The parsed bigint value
 * @throws Error if parsing fails or input format is invalid
 */
function parseBigIntInternal(input: string | undefined): bigint {
    if (!input) {
        throw new Error("BigInt input must not be empty")
    }

    if (!/^-?[0-9]+$/.test(input)) {
        throw new Error(`BigInt input must be numeric: ${input}`)
    }

    try {
        return BigInt(input)
    } catch (error) {
        throw new Error(
            `Failed to parse BigInt value: ${input}. ${error instanceof Error ? error.message : "Unknown error"}`,
        )
    }
}

function padHex(count: number): (hex: Hex) => Hex {
    return (hex: Hex) => `0x${hex.slice(2).padStart(count, "0")}`
}

function lt<T extends bigint | number>(
    upperBound: bigint | number,
    asStr?: string,
): (it: T, ctx: Traversal) => boolean {
    return (it, ctx) => BigInt(it) < BigInt(upperBound) || ctx.mustBe(`< ${asStr ?? upperBound}`)
}

function gte<T extends bigint | number>(
    upperBound: bigint | number,
    asStr?: string,
): (it: T, ctx: Traversal) => boolean {
    return (it, ctx) => BigInt(it) >= BigInt(upperBound) || ctx.mustBe(`>= ${asStr ?? upperBound}`)
}

// =====================================================================================================================
// VALIDATION-ONLY TYPES (for OpenAPI specs)

export const Bytes = type("/^0x[0-9a-fA-F]*/") as Type<Hex>

export const Bytes32 = type("/^0x[0-9a-fA-F]{0,64}$/") as Type<Hex>

export const Hash = Bytes32

export const Address = type("/^0x[0-9a-fA-F]{0,40}$/") as Type<Hex>

export const BigIntType = type("/^-?[0-9]+$/") as Type<string>

// Only allow positive integers using a predicate function
export const UInt256 = BigIntType

export const Int256 = BigIntType

export const UInt32 = type.number

// =====================================================================================================================
// TYPES WITH TRANSFORMATIONS (for input validation)

export const BytesIn = Bytes.configure({ example: "0xdeadbeefdeadbeef" })

export const Bytes32In = Bytes32.pipe(padHex(64)).configure({
    example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
})

export const HashIn = Bytes32In

export const AddressIn = Address.pipe(padHex(40))
    .pipe(checksum)
    .configure({ example: "0xf4822fc7cb2ec69a5f9d4b5d4a59b949effa8311" })

export const UInt256In = UInt256.pipe
    .try(parseBigIntInternal)
    .narrow(gte(0n))
    .narrow(lt(1n << 256n, "2^256"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const Int256In = Int256.pipe
    .try(parseBigIntInternal)
    .narrow(gte(-1n << 255n, "-2^255"))
    .narrow(lt(1n << 255n, "2^255"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const UInt32In = UInt32.pipe
    .try(Number)
    .narrow(gte(0))
    .narrow(lt(1n << 32n, "2^32"))
    .configure({ example: 400_000 })
