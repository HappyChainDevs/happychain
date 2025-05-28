import { type Hex, stringToBigInt } from "@happy.tech/common"
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

// Base validators without transformations for OpenAPI
export const BytesValidation = type("/^0x[0-9a-fA-F]*/") as Type<Hex>

export const Bytes20Validation = type("/^0x[0-9a-fA-F]{0,40}$/") as Type<Hex>

export const Bytes32Validation = type("/^0x[0-9a-fA-F]{0,64}$/") as Type<Hex>

export const HashValidation = Bytes32Validation

export const AddressValidation = Bytes20Validation

export const BigIntValidation = type.string

export const UInt256Validation = BigIntValidation.configure({ example: 10_100_200_300_400_500_600n })

export const Int256Validation = BigIntValidation.configure({ example: 10_100_200_300_400_500_600n })

export const UInt32Validation = type.number.configure({ example: 400_000 })

// =====================================================================================================================
// TYPES WITH TRANSFORMATIONS (for input validation)

export const Bytes = BytesValidation

export const Bytes20 = Bytes20Validation.pipe(padHex(40)).configure({
    example: "0x1234567890123456789012345678901234567890",
})

export const Bytes32 = Bytes32Validation.pipe(padHex(64)).configure({
    example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
})

export const Address = Bytes20.pipe(checksum).configure({ example: "0x1234567890123456789012345678901234567890" })

export const Hash = Bytes32.configure({ example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" })

export const BigIntSchema = BigIntValidation.pipe
    .try(stringToBigInt)
    .narrow(gte(0n))
    .narrow(lt(1n << 256n, "2^256"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const UInt256 = UInt256Validation.pipe
    .try(stringToBigInt)
    .narrow(gte(0n))
    .narrow(lt(1n << 256n, "2^256"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const Int256 = Int256Validation.pipe
    .try(stringToBigInt)
    .narrow(gte(-1n << 255n, "-2^255"))
    .narrow(lt(1n << 255n, "2^255"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const UInt32 = UInt32Validation.pipe
    .try(Number)
    .narrow(gte(0))
    .narrow(lt(1n << 32n, "2^32"))
    .configure({ example: 400_000 })
