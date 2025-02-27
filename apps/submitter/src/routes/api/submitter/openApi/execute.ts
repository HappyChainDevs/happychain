import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { deployment } from "#src/deployments"
import env from "#src/env"
import { TransactionTypeName } from "#src/tmp/interface/common_chain"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { isHexString } from "#src/utils/zod/refines/isHexString"
import { toBigInt } from "#src/utils/zod/transforms/toBigInt"

const happyTxSchema = z.object({
    account: z.string().refine(isHexString), // Address
    gasLimit: z.string().transform(toBigInt), // UInt32 //
    executeGasLimit: z.string().transform(toBigInt), // UInt32 //
    dest: z.string().refine(isHexString), // Address
    value: z.string().transform(toBigInt), // UInt256
    callData: z.string().refine(isHexString), // Bytes
    nonceTrack: z.string().transform(toBigInt), // UInt256
    nonceValue: z.string().transform(toBigInt), // UInt256
    maxFeePerGas: z.string().transform(toBigInt),
    submitterFee: z.string().transform(toBigInt),
    paymaster: z.string().refine(isHexString), // Address
    paymasterData: z.string().refine(isHexString), // Bytes
    validatorData: z.string().refine(isHexString), // Bytes
    extraData: z.string().refine(isHexString), // Bytes
})

const transactionSchema = z.object({
    address: z.string(),
    blockHash: z.string(),
    blockNumber: z.string(),
    blockTimestamp: z.string(),
    data: z.string(),
    logIndex: z.number(),
    removed: z.boolean(),
    topics: z.string().array(),
    transactionHash: z.string(),
    transactionIndex: z.number(),
})

export const inputSchema = z
    .object({
        /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
        entryPoint: z.string().refine(isHexString).optional().default(deployment.HappyEntryPoint),

        /** HappyTx to execute. */
        tx: happyTxSchema,
        // tx: z.string().refine(isHexString),
    })
    .openapi({
        example: {
            // tx: "0x1234", // pre encoded
            tx: {
                account: "0x123", // Address
                dest: "0x123", // Address
                value: "0x1", // UInt256
                callData: "0x00000", // Bytes
                nonceTrack: "1234", // UInt256
                nonceValue: "1234", // UInt256
                paymaster: "0x123", // Address
                paymasterData: "0x00000", // Bytes
                validatorData: "0x00000", // Bytes
                extraData: "0x00000", // Bytes
                gasLimit: "0",
                executeGasLimit: "0",
                maxFeePerGas: "0",
                submitterFee: "0",
            },
        },
    })

const outputSchema = z
    .object({
        status: z.string(),
        included: z.boolean(),
        receipt: z.object({
            happyTxHash: z.string(),
            account: z.string(),
            nonceTrack: z.string(),
            nonceValue: z.string(),
            entryPoint: z.string(),
            status: z.string(),
            logs: z.string().array(),
            revertData: z.string(),
            failureReason: z.string(),
            // gasUsed: z.string().transform(BigInt),
            // gasCost: z.string().transform(BigInt),
            txReceipt: z.object({
                blobGasPrice: z.union([z.string(), z.undefined()]),
                blobGasUsed: z.union([z.string(), z.undefined()]),
                blockHash: z.string(),
                // blockNumber: z.string().transform(BigInt),
                contractAddress: z.null(),
                // cumulativeGasUsed: z.string().transform(BigInt),
                // effectiveGasPrice: z.string().transform(BigInt),
                from: z.string(),
                // gasUsed: z.string().transform(BigInt),
                logs: transactionSchema.array(), //z.string().array(),
                logsBloom: z.string(),
                root: z.union([z.string(), z.undefined()]),
                status: z.string(),
                to: z.union([z.string(), z.null()]),
                transactionHash: z.string(),
                transactionIndex: z.number(),
                type: z.string(),
            }),
        }),
    })
    .openapi({
        example: {
            status: EntryPointStatus.Success,
            included: false,
            receipt: {
                happyTxHash: "0x",
                account: "0x",
                nonceTrack: "0x1",
                nonceValue: "0x1",
                entryPoint: "0x",
                status: EntryPointStatus.Success,
                logs: [],
                revertData: "0x",
                failureReason: "0x",
                // gasUsed: "0",
                // gasCost: "0",
                txReceipt: {
                    blobGasPrice: undefined,
                    blobGasUsed: undefined,
                    blockHash: "0x",
                    // blockNumber: "0",
                    contractAddress: null,
                    // cumulativeGasUsed: "0",
                    // effectiveGasPrice: "0",
                    from: "0x",
                    // gasUsed: "0",
                    logs: [],
                    logsBloom: "0x",
                    root: undefined,
                    status: "success",
                    to: null,
                    transactionHash: "0x",
                    transactionIndex: 0,
                    type: TransactionTypeName.EIP1559,
                },
            },
        },
    })

export const description = describeRoute({
    validateResponse: env.NODE_ENV !== "production",
    description: "Execute HappyTX",
    responses: {
        200: {
            description: "Successful TX execution",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("json", inputSchema)
