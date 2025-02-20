import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { z } from "zod"
import { adjustPaymasterGasRates } from "#src/actions/adjustPaymasterGasRates"
import { executeHappyTx } from "#src/actions/executeHappyTx"
import { fetchNonce } from "#src/actions/fetchNonce"
import { findExecutionAccount } from "#src/actions/findExecutionAccount"
import { submitterClient } from "#src/clients"
import { db } from "#src/database"
import { createNonceQueueManager, enqueueBuffer } from "#src/nonceQueueManager"
import { HappyReceiptRepository } from "#src/repositories/HappyReceiptRepository"
import { HappyStateRepository } from "#src/repositories/HappyStateRepository"
import { HappyTransactionRepository } from "#src/repositories/HappyTransactionRepository"
import { HappyReceiptService } from "#src/services/HappyReceiptService"
import { HappyStateService } from "#src/services/HappyStateService"
import { HappyTransactionService } from "#src/services/HappyTransactionService"
import { SubmitterService } from "#src/services/SubmitterService"
import { type StateRequestOutput, StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus, SimulatedValidationStatus } from "#src/tmp/interface/status"
import type { EstimateGasOutput } from "#src/tmp/interface/submitter_estimateGas"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { serializeBigInt } from "#src/utils/lossy-bigint"
import { estimateGasDescription } from "./submitter_estimateGas/EstimateGasDescription"
import { estimateGasValidation } from "./submitter_estimateGas/EstimateGasInputSchema"
import { executeDescription } from "./submitter_execute/ExecuteDescription"
import { executeValidation } from "./submitter_execute/ExecuteInputSchema"
import { stateDescription } from "./submitter_state/StateDescription"
import { stateInputParams } from "./submitter_state/StateInputSchema"

const happyStateRepository = new HappyStateRepository(db)
const happyTransactionRepository = new HappyTransactionRepository(db)
const happyReceiptRepository = new HappyReceiptRepository(db)

const happyTransactionService = new HappyTransactionService(happyTransactionRepository)
const happyStateService = new HappyStateService(happyStateRepository)
const happyReceiptService = new HappyReceiptService(happyReceiptRepository)

const submitterService = new SubmitterService(happyTransactionService, happyStateService, happyReceiptService)

const executeManager = createNonceQueueManager(5, 10, executeHappyTx, fetchNonce)

export default new Hono()
    .post("/estimateGas", estimateGasDescription, estimateGasValidation, async (c) => {
        const data = c.req.valid("json")

        const account = findExecutionAccount(data.tx)

        const estimates = await submitterClient.estimateSubmitGas({
            account,
            address: data.entryPoint,
            args: [encodeHappyTx(data.tx)],
        })

        return c.json(
            {
                simulationResult: {
                    status: EntryPointStatus.Success,
                    validationStatus: SimulatedValidationStatus.Success,
                    entryPoint: data.entryPoint,
                },
                executeGasLimit: estimates.executeGasLimit,
                gasLimit: estimates.gasLimit,
                maxFeePerGas: estimates.maxFeePerGas,
                submitterFee: estimates.submitterFee,
                status: EntryPointStatus.Success,
            } satisfies EstimateGasOutput,
            200,
        )
    })

    .post("/execute", executeDescription, executeValidation, async (c) => {
        const data = c.req.valid("json")

        // Adjust tx if needed
        // TODO: this was extracted from 'executeHappyTx' so that i can compute the complete happyTxHash
        // before enqueuing into the buffer. However this may be a mistake as maybe we can't properly
        // estimate the gas if the nonce is out of order/not ready yet?
        // If we move this back into the 'executeHappyTx' call, then we can't store the happyTx by hash
        // beforehand like this. do we want to exclude gas values from the happyTxHash calculation, or..?
        const { entryPoint, tx, simulate } = await adjustPaymasterGasRates(data)

        // persists raw happyTransaction
        const persistedTx = await submitterService.initialize(entryPoint, tx)

        // Enqueue to be processed sequentially (by nonce/nonce track)
        const finalState = await enqueueBuffer(executeManager, {
            // buffer management
            nonceTrack: persistedTx.nonceTrack,
            nonceValue: persistedTx.nonceValue,
            account: persistedTx.account,
            // additional data
            simulate,
            entryPoint: persistedTx.entryPoint,
            tx: persistedTx,
        })

        // inserts final happyState+happyReceipt status
        await submitterService.finalize(persistedTx.id as number, finalState)

        return c.json(serializeBigInt(finalState), 200)
    })
    .get("/state/:hash", stateDescription, stateInputParams, async (c) => {
        const { hash } = c.req.valid("param")
        const state = await happyStateService.findByHash(hash)

        const response: StateRequestOutput = state
            ? {
                  status: StateRequestStatus.Success,
                  state: state,
              }
            : {
                  status: StateRequestStatus.UnknownHappyTx,
                  state: undefined,
              }

        return c.json(response, 200)
    })
    .get(
        "/receipt/:hash",
        // TODO: OpenAPI description
        zValidator("param", z.object({ hash: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")) })),
        zValidator("query", z.object({ timeout: z.coerce.number().optional() })),
        async (c) => {
            const { hash } = c.req.valid("param")

            const { timeout } = c.req.valid("query")

            const state = await happyStateService.findByHashAndTimeout(hash, timeout)

            const response: StateRequestOutput = state
                ? {
                      status: StateRequestStatus.Success,
                      state: state,
                  }
                : {
                      status: StateRequestStatus.UnknownHappyTx,
                      state: undefined,
                  }

            return c.json(response, 200)
        },
    )
