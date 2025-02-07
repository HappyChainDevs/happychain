import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"

const happyTxSchema = z.object({
    account: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    gasLimit: z.coerce.number().optional(), // UInt32 //
    executeGasLimit: z.coerce.number().optional(), // UInt32 //
    dest: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    value: z.string().transform(BigInt), // UInt256
    callData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
    nonce: z.string().transform(BigInt), // UInt256
    maxFeePerGas: z.string().transform(BigInt).optional(), // UInt256 //
    submitterFee: z.string().transform(BigInt).optional(), // Int256 //
    paymaster: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    paymasterData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
    validatorData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
    extraData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
})

export const EstimateGasInputSchema = z
    .object({
        /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
        entryPoint: z
            .string()
            .refine((str): str is `0x${string}` => str.startsWith("0x"))
            .optional(),

        /**
         * HappyTx for which to estimate gas limits and fee parameters. The gas limits and fee
         * parameters are made optional.
         */
        tx: happyTxSchema,
    })
    .openapi({
        example: {
            tx: {
                account: "0x123", // Address
                dest: "0x123", // Address
                value: "1234", // UInt256
                callData: "0x00000", // Bytes
                nonce: "1234", // UInt256
                paymaster: "0x123", // Address
                paymasterData: "0x00000", // Bytes
                validatorData: "0x00000", // Bytes
                extraData: "0x00000", // Bytes
            },
        },
    })

export const estimateGasValidation = zv("json", EstimateGasInputSchema)
