import { checksum } from "ox/Address"
import { z } from "zod"
import { isAddress } from "#lib/utils/zod/refines/isAddress"
import { isHexString } from "#lib/utils/zod/refines/isHexString"
import { toBigInt } from "#lib/utils/zod/transforms/toBigInt"

export const boopInputSchema = z.object({
    account: z
        .string()
        .refine(isAddress)
        .transform(checksum)
        .openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }), // Address
    dest: z
        .string()
        .refine(isAddress)
        .transform(checksum)
        .openapi({ example: "0x07b354EFA748883a342a9ba4780Cc9728f51e3D5" }), // Address
    payer: z
        .string()
        .refine(isAddress)
        .transform(checksum)
        .openapi({ example: "0x0000000000000000000000000000000000000000" }), // Address
    value: z.string().transform(toBigInt).openapi({ example: "0" }), // UInt256
    callData: z.string().refine(isHexString).openapi({
        example:
            "0x40c10f1900000000000000000000000031b01adeb03855eecbaf17828bbd7d0ee918ed9200000000000000000000000000000000000000000000000000038d7ea4c68000",
    }), // Bytes
    nonceTrack: z.string().transform(toBigInt).openapi({ example: "0" }), // UInt256
    nonceValue: z.string().transform(toBigInt).openapi({ example: "25" }), // UInt256

    // gas
    maxFeePerGas: z.string().transform(toBigInt).openapi({ example: "1200000000" }), // UInt256 //
    submitterFee: z.string().transform(toBigInt).openapi({ example: "100" }), // Int256 //
    gasLimit: z.string().transform(toBigInt).openapi({ example: "4000000000" }), // UInt32 //
    validateGasLimit: z.string().transform(toBigInt).openapi({ example: "4000000000" }), // UInt32 //
    executeGasLimit: z.string().transform(toBigInt).openapi({ example: "4000000000" }), // UInt32 //
    validatePaymentGasLimit: z.string().transform(toBigInt).openapi({ example: "4000000000" }), // UInt32 //

    validatorData: z.string().refine(isHexString).openapi({ example: "0x" }), // Bytes
    extraData: z.string().refine(isHexString).openapi({ example: "0x" }), // Bytes
})
