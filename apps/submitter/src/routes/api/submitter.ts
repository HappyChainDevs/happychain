import { Hono } from "hono"
import { publicClient, submitterClient } from "#src/clients"
import { BaseFailedError, BaseRevertedError } from "#src/errors"
import { parseFromViemError } from "#src/errors/utils"
import { decodeHappyTx } from "#src/utils/decodeHappyTx"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
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
        try {
            const data = c.req.valid("json")

            const decoded = decodeHappyTx(data.tx)

            // If using a paymaster, these values may be left as 0
            // and we will fill in here
            if (decoded.account !== decoded.paymaster) {
                decoded.executeGasLimit ||= 4000000000
                decoded.gasLimit ||= 4000000000
                decoded.maxFeePerGas ||= ((await publicClient.estimateMaxPriorityFeePerGas()) * 120n) / 100n
                decoded.submitterFee ||= 100n
            }

            const { request } = await submitterClient.simulateSubmit({
                address: data.entryPoint,
                args: [encodeHappyTx(decoded)],
            })

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
        } catch (_err) {
            if (_err instanceof BaseFailedError) return c.json(_err.getResponseData(), 500)
            if (_err instanceof BaseRevertedError) return c.json(_err.getResponseData(), 500)

            // Try to parse raw viem error, or fallback to unknown
            const hailMary = parseFromViemError(_err)?.getResponseData() ?? { status: "unknown" }
            return c.json(hailMary, 500)
        }
    })
