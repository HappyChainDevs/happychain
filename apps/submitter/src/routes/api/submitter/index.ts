import { Hono } from "hono"
import { executeHappyTx } from "#src/actions/executeHappyTx"
import { submitterClient } from "#src/clients"
import { db } from "#src/database"
import { HappyBaseError } from "#src/errors"
import { parseFromViemError } from "#src/errors/utils"
import { createNonceQueueManager, enqueueBuffer } from "#src/nonceQueueManager"
import { HappyReceiptRepository } from "#src/repositories/HappyReceiptRepository"
import { HappyStateRepository } from "#src/repositories/HappyStateRepository"
import { HappyTransactionRepository } from "#src/repositories/HappyTransactionRepository"
import { HappyReceiptService } from "#src/services/HappyReceiptService"
import { HappyStateService } from "#src/services/HappyStateService"
import { HappyTransactionService } from "#src/services/HappyTransactionService"
import { SubmitterService } from "#src/services/SubmitterService"
import { EntryPointStatus, SimulatedValidationStatus } from "#src/tmp/interface/status"
import type { EstimateGasOutput } from "#src/tmp/interface/submitter_estimateGas"
import { adjustPaymasterGasRates } from "#src/utils/adjustPaymasterGasRates"
import { serializeBigInt } from "#src/utils/bigint-lossy"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { fetchNonce } from "#src/utils/fetchNonce"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"
import * as estimateGasRoute from "./openApi/estimateGas"
import * as executeRoute from "./openApi/execute"

const happyStateRepository = new HappyStateRepository(db)
const happyTransactionRepository = new HappyTransactionRepository(db)
const happyReceiptRepository = new HappyReceiptRepository(db)

const happyTransactionService = new HappyTransactionService(happyTransactionRepository)
const happyStateService = new HappyStateService(happyStateRepository)
const happyReceiptService = new HappyReceiptService(happyReceiptRepository)

const submitterService = new SubmitterService(happyTransactionService, happyStateService, happyReceiptService)

const executeManager = createNonceQueueManager(5, 10, executeHappyTx, fetchNonce)

export default new Hono()
    .post("/estimateGas", estimateGasRoute.description, estimateGasRoute.validation, async (c) => {
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

    .post("/execute", executeRoute.description, executeRoute.validation, async (c) => {
        try {
            const data = c.req.valid("json")

            // Adjust tx if needed
            // TODO: this was extracted from 'executeHappyTx' so that i can compute the complete happyTxHash
            // before enqueuing into the buffer. However this may be a mistake as maybe we can't properly
            // estimate the gas if the nonce is out of order/not ready yet?
            // If we move this back into the 'executeHappyTx' call, then we can't store the happyTx by hash
            // beforehand like this. do we want to exclude gas values from the happyTxHash calculation, or..?
            const { entryPoint, tx, simulate } = await adjustPaymasterGasRates(data)

            console.log({ tx, data: data.tx })
            // persists raw happyTransaction
            const persistedTx = await submitterService.initialize(entryPoint, tx)

            // Enqueue to be processed sequentially (by nonce/nonce track)
            const finalState = await enqueueBuffer(executeManager, {
                // buffer management
                nonceTrack: tx.nonceTrack,
                nonceValue: tx.nonceValue,
                account: tx.account,
                // additional data
                simulate,
                entryPoint: entryPoint,
                tx: tx,
            })

            // inserts final happyState+happyReceipt status
            await submitterService.finalize(persistedTx.id as number, finalState)

            return c.json(serializeBigInt(finalState), 200)
        } catch (err) {
            if (err instanceof HappyBaseError) return c.json(err.getResponseData(), 500)

            // Try to parse raw viem error, or fallback to unknown
            const fallback = parseFromViemError(err)?.getResponseData()
            if (fallback) return c.json(fallback, 500)

            // Unknown/Unhandled
            throw err
        }
    })
