import { Hono } from "hono"
import { executeHappyTx } from "#src/actions/executeHappyTx"
import { fetchNonce } from "#src/actions/fetchNonce"
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

        const { request } = await submitterClient.simulateSubmit({
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
                executeGasLimit: data.tx.executeGasLimit,
                gasLimit: data.tx.gasLimit,
                maxFeePerGas: request.maxFeePerGas?.toString(16),
                submitterFee: data.tx.submitterFee?.toString(16),
                status: "success",
            },
            200,
        )
    })

    .post("/execute", executeDescription, executeValidation, async (c) => {
        try {
            const data = c.req.valid("json")

            const receipt = await enqueueBuffer(executeManager, {
                // buffer management
                nonceTrack: data.tx.nonceTrack,
                nonceValue: data.tx.nonceValue,
                account: data.tx.account,
                // additional data
                entryPoint: data.entryPoint,
                tx: data.tx,
            })

            return c.json(
                {
                    status: receipt.status,
                    included: Boolean(receipt.txReceipt.transactionHash),
                    receipt,
                },
                200,
            )
        } catch (_err) {
            if (_err instanceof BaseFailedError) return c.json(_err.getResponseData(), 500)
            if (_err instanceof BaseRevertedError) return c.json(_err.getResponseData(), 500)

            // Try to parse raw viem error, or fallback to unknown
            const hailMary = parseFromViemError(_err)?.getResponseData() ?? { status: "unknown" }
            return c.json(hailMary, 500)
        }
    })
