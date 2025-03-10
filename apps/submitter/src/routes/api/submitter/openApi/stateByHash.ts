import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { deployment } from "#src/deployments"
import env from "#src/env"
import { StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { TransactionTypeName } from "#src/tmp/interface/common_chain"
import { EntryPointStatus, SimulatedValidationStatus, SubmitterErrorStatus } from "#src/tmp/interface/status"
import { isHexString } from "#src/utils/zod/refines/isHexString"

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

const inputSchema = z
    .object({
        hash: z.string().refine(isHexString),
    })
    .openapi({
        example: {
            hash: "0xd7ebadc747305fa2ad180a8666724d71ff5936787746b456cdb976b5c9061fbc",
        },
    })

const HappyTxStateSubmitterErrorSchema = z.object({
    status: z.enum([
        SubmitterErrorStatus.BufferExceeded,
        SubmitterErrorStatus.OverCapacity,
        SubmitterErrorStatus.UnexpectedError,
        SubmitterErrorStatus.SimulationTimeout,
    ]),
})

const HappyTxStateEntryPointErrorSchema = z.object({
    status: z.enum([
        // Omit<EntryPointStatus, EntryPointStatus.Success>
        EntryPointStatus.ValidationReverted,
        EntryPointStatus.ValidationFailed,
        EntryPointStatus.ExecuteReverted,
        EntryPointStatus.ExecuteFailed,
        EntryPointStatus.PaymentReverted,
        EntryPointStatus.PaymentFailed,
        EntryPointStatus.UnexpectedReverted,
        // SubmitterErrorSimulationMaybeAvailable
        SubmitterErrorStatus.SubmitTimeout,
        SubmitterErrorStatus.ReceiptTimeout,
    ]),
    included: z.literal(false),
    simulation: z.object({}).optional(), // TODO: SimulationResult | undefined
})

const HappyTxReceiptSchema = z.object({
    happyTxHash: z.string(),
    account: z.string(),
    nonceTrack: z.string(),
    nonceValue: z.string(),
    entryPoint: z.string(),
    status: z.string(),
    logs: z.string().array(),
    revertData: z.string(),
    failureReason: z.string(),
    gasUsed: z.coerce.string(),
    gasCost: z.coerce.string(),
    txReceipt: z.object({
        blobGasPrice: z.union([z.undefined(), z.string()]),
        blobGasUsed: z.undefined(),
        blockHash: z.string(),
        blockNumber: z.string(),
        contractAddress: z.null(),
        cumulativeGasUsed: z.string(),
        effectiveGasPrice: z.string(),
        from: z.string(),
        gasUsed: z.string(),
        logs: transactionSchema.array(),
        logsBloom: z.string(),
        root: z.union([z.undefined(), z.string()]),
        status: z.string(),
        to: z.string(),
        transactionHash: z.string(),
        transactionIndex: z.number(),
        type: z.string(),
    }),
})

const HappySimulationSchema = z.object({
    status: z.string(),
    validationStatus: z.string(),
    entryPoint: z.string(),
    failureReason: z.string().refine(isHexString),
    revertData: z.string().refine(isHexString),
})

const HappyTxStateSuccessSchema = z.object({
    status: z.literal(EntryPointStatus.Success),
    included: z.literal(true),
    simulation: HappySimulationSchema.optional(),
    receipt: HappyTxReceiptSchema,
})

const outputSchema = z
    .object({
        status: z.enum([StateRequestStatus.Success, StateRequestStatus.UnknownHappyTx]),
        state: z.discriminatedUnion("status", [
            HappyTxStateSuccessSchema,
            HappyTxStateEntryPointErrorSchema,
            HappyTxStateSubmitterErrorSchema,
        ]),
    })
    .openapi({
        example: {
            status: StateRequestStatus.Success,
            state: {
                status: EntryPointStatus.Success,
                included: true,
                simulation: {
                    status: EntryPointStatus.Success,
                    validationStatus: SimulatedValidationStatus.Success,
                    entryPoint: deployment.HappyEntryPoint,
                    failureReason: "0x",
                    revertData: "0x",
                },
                receipt: {
                    happyTxHash: "0x",
                    account: "0x",
                    nonceTrack: "0",
                    nonceValue: "1",
                    entryPoint: "0x",
                    status: EntryPointStatus.Success,
                    logs: [],
                    revertData: "0x",
                    failureReason: "0x",
                    gasUsed: "0",
                    gasCost: "0",
                    txReceipt: {
                        blobGasPrice: undefined,
                        blobGasUsed: undefined,
                        blockHash: "0x",
                        blockNumber: "0",
                        contractAddress: null,
                        cumulativeGasUsed: "0",
                        effectiveGasPrice: "0",
                        from: "0x",
                        gasUsed: "0",
                        logs: [],
                        logsBloom: "0x",
                        root: undefined,
                        status: "success",
                        to: "0x",
                        transactionHash: "0x",
                        transactionIndex: 0,
                        type: TransactionTypeName.EIP1559,
                    },
                },
            },
        },
    })

export const description = describeRoute({
    validateResponse: env.NODE_ENV !== "production",
    description: "Retrieve state by HappyTxHash",
    responses: {
        200: {
            description: "Successful State Retrieval",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("param", inputSchema)
