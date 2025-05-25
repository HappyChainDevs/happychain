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

export const Bytes = (type("/^0x[0-9a-fA-F]*/") as Type<Hex>) //
    .configure({
        example:
            "0x40c10f1900000000000000000000000031b01adeb03855eecbaf17828bbd7d0ee918ed92" +
            "00000000000000000000000000000000000000000000000000038d7ea4c68000",
    })

export const Bytes20 = (type("/^0x[0-9a-fA-F]{0,40}$/") as Type<Hex>)
    .pipe(padHex(40))
    .configure({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" })

export const Bytes32 = (type("/^0x[0-9a-fA-F]{0,64}$/") as Type<Hex>) //
    .pipe(padHex(64))
    .configure({ example: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" })

export const Hash = Bytes32

export const Address = Bytes20.pipe(checksum) //
    .configure({ example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" })

export const BigIntSchema = type("bigint | string").pipe.try(BigInt)

export const UInt256 = type(BigIntSchema)
    .narrow(gte(0n))
    .narrow(lt(1n << 256n, "2^256"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const Int256 = type(BigIntSchema)
    .narrow(gte(-(1n << 255n), "-2^255"))
    .narrow(lt(1n << 255n, "2^255"))
    .configure({ example: 10_100_200_300_400_500_600n })

export const UInt32 = type("number.integer | string.integer.parse")
    .narrow(gte(0))
    .narrow(lt(1n << 32n, "2^32"))
    .configure({ example: 400_000n })
