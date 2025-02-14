import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { deployment } from "#src/deployments"

const toBigInt = (n: string) => (n === "0x" ? BigInt(0) : BigInt(n))

const happyTxSchema = z.object({
    account: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    dest: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Address
    value: z.string().transform(toBigInt), // UInt256
    callData: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")), // Bytes
    nonceTrack: z.string().transform(toBigInt), // UInt256
    nonceValue: z.string().transform(toBigInt), // UInt256

    // gas
    gasLimit: z.string().transform(toBigInt), // UInt32 //
    executeGasLimit: z.string().transform(toBigInt), // UInt32 //
    maxFeePerGas: z.string().transform(toBigInt), // UInt256 //
    submitterFee: z.string().transform(toBigInt), // Int256 //

    // Paymaster Data
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
            .optional()
            .default(deployment.HappyEntryPoint),

        /**
         * HappyTx for which to estimate gas limits and fee parameters. The gas limits and fee
         * parameters are made optional.
         */
        tx: happyTxSchema,
    })
    .openapi({
        example: {
            tx: {
                account: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
                dest: "0x07b354EFA748883a342a9ba4780Cc9728f51e3D5",
                value: "0",
                callData:
                    "0x40c10f1900000000000000000000000031b01adeb03855eecbaf17828bbd7d0ee918ed9200000000000000000000000000000000000000000000000000038d7ea4c68000",
                nonceTrack: "0",
                nonceValue: "0",
                paymaster: "0x",
                paymasterData: "0x",
                validatorData: "0x",
                extraData: "0x",

                gasLimit: "0",
                executeGasLimit: "0",
                maxFeePerGas: "0",
                submitterFee: "0",
            },
        },
    })

export const estimateGasValidation = zv("json", EstimateGasInputSchema)
