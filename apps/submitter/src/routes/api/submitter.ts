import { Hono } from "hono"
import { submitterClient } from "#src/clients"
import { decodeHappyTx } from "#src/utils/decodeHappyTx"
import { estimateGasDescription } from "./submitter_estimateGas/EstimateGasDescription"
import { estimateGasValidation } from "./submitter_estimateGas/EstimateGasInputSchema"
import { executeDescription } from "./submitter_execute/ExecuteDescription"
import { executeValidation } from "./submitter_execute/ExecuteInputSchema"

export default new Hono()
    .post("/estimateGas", estimateGasDescription, estimateGasValidation, async (c) => {
        const data = c.req.valid("json")

        const { request } = await submitterClient.simulateSubmit({ address: data.entryPoint, args: [data.tx] })

        const decoded = decodeHappyTx(data.tx)

        return c.json(
            {
                simulationResult: {
                    status: "success",
                    validationStatus: "success",
                    entryPoint: data.entryPoint,
                },
                maxFeePerGas: request.maxFeePerGas?.toString(16),
                submitterFee: decoded.submitterFee.toString(16),
                gasLimit: decoded.gasLimit,
                executeGasLimit: decoded.executeGasLimit,
                status: "success",
            },
            200,
        )
    })

    .post("/execute", executeDescription, executeValidation, async (c) => {
        const data = c.req.valid("json")

        const { request } = await submitterClient.simulateSubmit({ address: data.entryPoint, args: [data.tx] })
        const hash = await submitterClient.submit(request)
        const receipt = await submitterClient.waitForSubmitReceipt({ hash, ...data })

        return c.json(
            {
                // duplicated from receipt?
                status: receipt.status,

                /** Whether the happyTx was included and executed onchain. */
                included: Boolean(receipt.txReceipt.transactionHash),

                receipt,
            },
            200,
        )
    })
