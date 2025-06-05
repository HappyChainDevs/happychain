import { type Address as AddressType, type Hex, getProp } from "@happy.tech/common"
import { type Traversal, type Type, type } from "arktype"
import { resolver } from "hono-openapi/arktype"
import type { OpenAPIV3 } from "openapi-types"
import { checksum } from "ox/Address"

// =====================================================================================================================
// METADATA

declare global {
    interface ArkEnv {
        meta(): {
            // This gets picked up by OpenAPI for examples.
            example?: unknown
        }
    }
}

// =====================================================================================================================
// HELPERS

export function openApiParameters({
    path = type({}),
    query = type({}),
}: {
    path?: Type<unknown>
    query?: Type<unknown>
}) {
    const pathJson = path.toJSON()
    const queryJson = query.toJSON()

    function isRequired(propName: string, json: object): boolean {
        const required = (getProp(json, "required") ?? []) as { key: string }[]
        return required.some((it) => it.key === propName)
    }

    return path.internal.flatRefs
        .map((ref) => ({
            name: ref.propString,
            in: "path",
            schema: ref.node.toJsonSchema() as OpenAPIV3.SchemaObject,
            required: isRequired(ref.propString, pathJson),
        }))
        .concat(
            query.internal.flatRefs.map((ref) => ({
                name: ref.propString,
                in: "query",
                schema: ref.node.toJsonSchema() as OpenAPIV3.SchemaObject,
                required: isRequired(ref.propString, queryJson),
            })),
        )
}

export function openApiResponseContent(schema: Type<unknown>) {
    return { "application/json": { schema: resolver(schema) } }
}

export function openApiBodyContent(schema: Type<unknown>) {
    return { "application/json": { schema: schema.toJsonSchema() as OpenAPIV3.SchemaObject } }
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
// TYPES

export const Bytes = type("/^0x[0-9a-fA-F]*/").configure({
    example: "0x1234567890123456789012345678901234567890123456789012345678901234",
}) as Type<Hex>

export const Bytes32 = type("/^0x[0-9a-fA-F]{0,64}$/")
    .pipe(padHex(64))
    .configure({ example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" })
    .as<Hex>()

export const Hash = Bytes32

export const Address = type("/^0x[0-9a-fA-F]{0,40}$/")
    .pipe(padHex(40))
    .pipe(checksum)
    .configure({ example: "0xf4822fc7cb2ec69a5f9d4b5d4a59b949effa8311" })
    .as<AddressType>()

export const BigIntString = type("/^-?[0-9]+$/").configure({ example: "10_100_200_300_400_500_600" })

export const PositiveBigIntString = type("/^[0-9]+$/").configure({ example: "10_100_200_300_400_500_600" })

// biome-ignore format: pretty
export const UInt256 = PositiveBigIntString
    .pipe((it) => BigInt(it)!) // Can't fail because of regex validation
    .narrow(lt(1n << 256n, "2^256"))
    .configure({ example: 10_100_200_300_400_500_600n })

// biome-ignore format: pretty
export const Int256 = BigIntString
    .pipe((it) => BigInt(it)!) // Can't fail because of regex validation
    .narrow(gte(-1n << 255n, "-2^255"))
    .narrow(lt(1n << 255n, "2^255"))
    .configure({ example: 10_100_200_300_400_500_600n })

// biome-ignore format: pretty
export const UInt32 = type.number
    .pipe(it => it) // Identity pipe before narrow: to make it possible to prune narrows with UInt32.in
    .narrow(gte(0))
    .narrow(lt(1n << 32n, "2^32"))
    .configure({ example: 400_000 })
