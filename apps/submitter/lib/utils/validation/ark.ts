import { type Hex, parseBigInt } from "@happy.tech/common"
import { type JsonSchema, type Traversal, type Type, type } from "arktype"
import { resolver } from "hono-openapi/arktype"
import type { OpenAPIV3 } from "openapi-types"
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

export function openApiContentBody(schema: Type<unknown>) {
    // Not sure why we need the cast, but it works!
    return { "application/json": { schema: schema.toJsonSchema() as OpenAPIV3.SchemaObject } }
}

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

export const Bytes = type("/^0x[0-9a-fA-F]*/").configure({ example: "0xdeadbeefdeadbeef" }) as Type<Hex>

export const Bytes32 = type("/^0x[0-9a-fA-F]{0,64}$/").configure({
    example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
}) as Type<Hex>

export const Hash = Bytes32

export const Address = type("/^0x[0-9a-fA-F]{0,40}$/").configure({
    example: "0xf4822fc7cb2ec69a5f9d4b5d4a59b949effa8311",
}) as Type<Hex>

export const BigIntString = type("/^-?[0-9]+$/").configure({ example: "10_100_200_300_400_500_600" })

export const PositiveBigIntString = type("/^[0-9]+$/").configure({ example: "10_100_200_300_400_500_600" })

export const UInt256 = BigIntString

export const Int256 = PositiveBigIntString

export const UInt32 = type.number.configure({ example: 400_000 })

// =====================================================================================================================
// TYPES WITH TRANSFORMATIONS (for input validation)

export const Bytes32In = Bytes32.pipe(padHex(64))

export const HashIn = Bytes32In

export const AddressIn = Address.pipe(padHex(40)).pipe(checksum)

// biome-ignore format: pretty
export const UInt256In = UInt256
    .pipe((it, ctx) => parseBigInt(it) ?? ctx.error("not a positive integer"))
    .narrow(lt(1n << 256n, "2^256"))
    .configure({ example: 10_100_200_300_400_500_600n })

// biome-ignore format: pretty
export const Int256In = Int256
    .pipe((it, ctx) => parseBigInt(it) ?? ctx.error("not an integer"))
    .narrow(gte(-1n << 255n, "-2^255"))
    .narrow(lt(1n << 255n, "2^255"))
    .configure({ example: 10_100_200_300_400_500_600n })

// biome-ignore format: pretty
export const UInt32In = UInt32
    .pipe(it => it) // pipe before narrow makes it possible to prune narrows with <type>.in
    .narrow(gte(0))
    .narrow(lt(1n << 32n, "2^32"))
    .configure({ example: 400_000 })
