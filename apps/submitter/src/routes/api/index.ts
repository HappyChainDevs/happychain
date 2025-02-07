import { Hono } from "hono"
import { submitterClient } from "#src/clients"
import { estimateGasDescription } from "./submitter_estimateGas/EstimateGasDescription"
import { estimateGasValidation } from "./submitter_estimateGas/EstimateGasInputSchema"
import { executeDescription } from "./submitter_execute/ExecuteDescription"
import { executeValidation } from "./submitter_execute/ExecuteInputSchema"

export default new Hono()
    .post("/submitter_estimateGas", estimateGasDescription, estimateGasValidation, async (c) => {
        const data = c.req.valid("json")
        const estimate = await submitterClient.submitterEstimateGas(data)
        return c.json(estimate, 200) // provide explicit response codes to help client RPC types
    })
    .post("/submitter_execute", executeDescription, executeValidation, async (c) => {
        const data = c.req.valid("json")
        const result = await submitterClient.submitterExecute(data)
        return c.json(result, 200)
    })
