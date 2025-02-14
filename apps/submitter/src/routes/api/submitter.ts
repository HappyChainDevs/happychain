import { Hono } from "hono"
import { executeHappyTx } from "#src/actions/executeHappyTx"
import { fetchNonce } from "#src/actions/fetchNonce"
import { findExecutionAccount } from "#src/actions/findExecutionAccount"
import { submitterClient } from "#src/clients"
import { BaseFailedError, BaseRevertedError } from "#src/errors"
import { parseFromViemError } from "#src/errors/utils"
import { createNonceQueueManager, enqueueBuffer } from "#src/nonceQueueManager"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { estimateGasDescription } from "./submitter_estimateGas/EstimateGasDescription"
import { estimateGasValidation } from "./submitter_estimateGas/EstimateGasInputSchema"
import { executeDescription } from "./submitter_execute/ExecuteDescription"
import { executeValidation } from "./submitter_execute/ExecuteInputSchema"

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
                    status: "success",
                    validationStatus: "success",
                    entryPoint: data.entryPoint,
                },
                executeGasLimit: estimates.executeGasLimit.toString(),
                gasLimit: estimates.gasLimit.toString(),
                maxFeePerGas: estimates.maxFeePerGas.toString(),
                submitterFee: estimates.submitterFee.toString(),
                status: "success",
            },
            200,
        )
    })

    .post("/execute", executeDescription, executeValidation, async (c) => {
        try {
            const data = c.req.valid("json")

            const state = await enqueueBuffer(executeManager, {
                // buffer management
                nonceTrack: data.tx.nonceTrack,
                nonceValue: data.tx.nonceValue,
                account: data.tx.account,
                // additional data
                entryPoint: data.entryPoint,
                tx: data.tx,
            })

            return c.json(state, 200)
        } catch (_err) {
            if (_err instanceof BaseFailedError) return c.json(_err.getResponseData(), 500)
            if (_err instanceof BaseRevertedError) return c.json(_err.getResponseData(), 500)

            // Try to parse raw viem error, or fallback to unknown
            const hailMary = parseFromViemError(_err)?.getResponseData() ?? { status: "unknown" }
            return c.json(hailMary, 500)
        }
    })
