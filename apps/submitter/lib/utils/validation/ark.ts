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

// TODO: Suggest a fix, stringToBigInt from @happy.tech/common is not suitable as it expects the `#bigint` prefix,
// TODO: BigInt() constructor may return undefined so that fails too
// TODO: parseBigInt from @happy.tech/common is not suitable as it returns undefined on failure
function parseBigIntInternal(input: string | undefined): bigint {
    try {
        return input ? BigInt(input) : 0n
    } catch {
        return 0n
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

// Base validators without transformations for OpenAPI
export const BytesValidation = type("/^0x[0-9a-fA-F]*/") as Type<Hex>

export const Bytes20Validation = type("/^0x[0-9a-fA-F]{0,40}$/") as Type<Hex>

export const Bytes32Validation = type("/^0x[0-9a-fA-F]{0,64}$/") as Type<Hex>

export const HashValidation = Bytes32Validation

export const AddressValidation = Bytes20Validation

// Accept both formats: plain numbers (from serializeBigInt) and numbers with 'n' suffix
export const BigIntValidation = type("/^-?[0-9]+(n)?$/") as Type<string>

export const UInt256Validation = BigIntValidation

export const Int256Validation = BigIntValidation

export const UInt32Validation = type.number

// =====================================================================================================================
// TYPES WITH TRANSFORMATIONS (for input validation)

export const Bytes = BytesValidation.configure({ example: "0xdeadbeefdeadbeef" })

export const Bytes20 = Bytes20Validation.pipe(padHex(40)).configure({
    example: "0x1234567890123456789012345678901234567890",
})

export const Bytes32 = Bytes32Validation.pipe(padHex(64)).configure({
    example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
})

export const Address = Bytes20.pipe(checksum).configure({ example: "0x1234567890123456789012345678901234567890" })

export const Hash = Bytes32.configure({ example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" })

export const UInt256 = UInt256Validation.pipe
    .try(parseBigIntInternal)
    .narrow(gte(0n))
    .narrow(lt(1n << 256n, "2^256"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const Int256 = Int256Validation.pipe
    .try(parseBigIntInternal)
    .narrow(gte(-1n << 255n, "-2^255"))
    .narrow(lt(1n << 255n, "2^255"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const UInt32 = UInt32Validation.pipe
    .try(Number)
    .narrow(gte(0))
    .narrow(lt(1n << 32n, "2^32"))
    .configure({ example: 400_000 })
