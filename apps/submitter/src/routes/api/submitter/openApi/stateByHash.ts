import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { TransactionTypeName } from "#src/tmp/interface/common_chain"
import { EntryPointStatus, SubmitterErrorStatus } from "#src/tmp/interface/status"
import { isHexString } from "#src/utils/zod/refines/isHexString"

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
    nonce: z.number(),
    entryPoint: z.string(),
    status: z.string(),
    logs: z.string().array(),
    revertData: z.string(),
    failureReason: z.string(),
    gasUsed: z.coerce.string(),
    gasCost: z.coerce.string(),
    txReceipt: z.object({
        blobGasPrice: z.undefined(),
        blobGasUsed: z.undefined(),
        blockHash: z.string(),
        blockNumber: z.string(),
        contractAddress: z.null(),
        cumulativeGasUsed: z.string(),
        effectiveGasPrice: z.string(),
        from: z.string(),
        gasUsed: z.string(),
        logs: z.string().array(),
        logsBloom: z.string(),
        root: z.undefined(),
        status: z.string(),
        to: z.null(),
        transactionHash: z.string(),
        transactionIndex: z.number(),
        type: z.string(),
    }),
})

const HappyTxStateSuccessSchema = z.object({
    status: z.literal(EntryPointStatus.Success),
    included: z.literal(true),
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
                receipt: {
                    happyTxHash: "0x",
                    account: "0x",
                    nonce: 1,
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
                        to: null,
                        transactionHash: "0x",
                        transactionIndex: 0,
                        type: TransactionTypeName.EIP1559,
                    },
                },
            },
        },
    })

export const description = describeRoute({
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
