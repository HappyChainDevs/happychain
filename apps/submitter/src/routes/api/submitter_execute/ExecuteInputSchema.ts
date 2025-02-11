import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { deployment } from "#src/deployments"

const happyTxSchema = z.object({
    account: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    gasLimit: z.coerce.number(), // UInt32 //
    executeGasLimit: z.coerce.number(), // UInt32 //
    dest: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    value: z.string().transform((a) => BigInt(a)), // UInt256
    callData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
    nonceTrack: z.string().transform(BigInt), // UInt256
    nonceValue: z.string().transform(BigInt), // UInt256
    maxFeePerGas: z.string().transform((a) => BigInt(a)),
    submitterFee: z.string().transform((a) => BigInt(a)),
    paymaster: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    paymasterData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
    validatorData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
    extraData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
})

export const ExecuteInputSchema = z
    .object({
        /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
        entryPoint: z
            .string()
            .refine((str): str is `0x${string}` => str.startsWith("0x"))
            .optional()
            .default(deployment.HappyEntryPoint),

        /** HappyTx to execute. */
        // tx: happyTxSchema,
        tx: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")),
    })
    .openapi({
        example: {
            tx: "0x1234", // pre encoded
            // tx: {
            //     account: "0x123", // Address
            //     dest: "0x123", // Address
            //     value: "1234", // UInt256
            //     callData: "0x00000", // Bytes
            //     nonceTrack: "1234", // UInt256
            //     nonceValue: "1234", // UInt256
            //     paymaster: "0x123", // Address
            //     paymasterData: "0x00000", // Bytes
            //     validatorData: "0x00000", // Bytes
            //     extraData: "0x00000", // Bytes
            //     gasLimit: 0,
            //     executeGasLimit: 0,
            //     maxFeePerGas: "0",
            //     submitterFee: "0",
            // },
        },
    })

export const executeValidation = zv("json", ExecuteInputSchema)
