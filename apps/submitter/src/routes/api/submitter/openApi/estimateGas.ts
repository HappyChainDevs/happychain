import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { deployment } from "#src/deployments"
import { isHexString } from "#src/utils/zod/refines/isHexString"
import { toBigInt } from "#src/utils/zod/transforms/toBigInt"

const happyTxSchema = z.object({
    account: z.string().refine(isHexString), // Address
    dest: z.string().refine(isHexString), // Address
    value: z.string().transform(toBigInt), // UInt256
    callData: z.string().refine(isHexString), // Bytes
    nonceTrack: z.string().transform(toBigInt), // UInt256
    nonceValue: z.string().transform(toBigInt), // UInt256

    // gas
    gasLimit: z.string().transform(toBigInt), // UInt32 //
    executeGasLimit: z.string().transform(toBigInt), // UInt32 //
    maxFeePerGas: z.string().transform(toBigInt), // UInt256 //
    submitterFee: z.string().transform(toBigInt), // Int256 //

    // Paymaster Data
    paymaster: z.string().refine(isHexString), // Address
    paymasterData: z.string().refine(isHexString), // Bytes
    validatorData: z.string().refine(isHexString), // Bytes
    extraData: z.string().refine(isHexString), // Bytes
})

const inputSchema = z
    .object({
        /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
        entryPoint: z.string().refine(isHexString).optional().default(deployment.HappyEntryPoint),

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

const outputSchema = z
    .object({
        simulationResult: z.object({
            status: z.string(),
            validationStatus: z.string(),
            entryPoint: z.string(),
        }),
        maxFeePerGas: z.string(),
        submitterFee: z.string(),
        gasLimit: z.string(),
        executeGasLimit: z.string(),
        status: z.string(),
    })
    .openapi({
        example: {
            simulationResult: {
                status: "success",
                validationStatus: "success",
                entryPoint: deployment.HappyEntryPoint,
            },
            maxFeePerGas: "0",
            submitterFee: "0",
            gasLimit: "0",
            executeGasLimit: "0",
            status: "success",
        },
    })

export const description = describeRoute({
    description: "Estimate gas for the supplied HappyTx",
    responses: {
        200: {
            description: "Successful gas estimation",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("json", inputSchema)
