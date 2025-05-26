import { Hono } from "hono"
import { executeBodyValidation, executeDescription } from "#lib/handlers/execute"
import { execute } from "#lib/handlers/execute/execute"
import { executeOutputValidation } from "#lib/handlers/execute/validation"
import {
    getPending,
    getPendingDescription,
    getPendingOutputValidation,
    getPendingParamValidation,
} from "#lib/handlers/getPending"
import {
    getState,
    getStateDescription,
    getStateOutputValidation,
    getStateParamValidation,
} from "#lib/handlers/getState"
import { simulate, simulateBodyValidation, simulateDescription, simulateOutputValidation } from "#lib/handlers/simulate"
import { submit, submitBodyValidation, submitDescription, submitOutputValidation } from "#lib/handlers/submit"
import {
    waitForReceipt,
    waitForReceiptDescription,
    waitForReceiptOutputValidation,
    waitForReceiptParamValidation,
    waitForReceiptQueryValidation,
} from "#lib/handlers/waitForReceipt"
import { makeResponse } from "#lib/server/makeResponse"
import { freezeBoopHashFields } from "#lib/utils/boop/freezeBoop.ts"
import { validateOutput } from "#lib/utils/validation/helpers"

export default new Hono()
    .post(
        "/simulate", //
        simulateDescription,
        simulateBodyValidation,
        async (c) => {
            const { entryPoint, boop } = c.req.valid("json")
            const output = await simulate({ entryPoint, boop: freezeBoopHashFields(boop) })
            validateOutput(output, simulateOutputValidation)
            const [body, code] = makeResponse(output)
            return c.json(body, code)
        },
    )
    .post(
        "/submit", //
        submitDescription,
        submitBodyValidation,
        async (c) => {
            const { entryPoint, boop } = c.req.valid("json")
            const output = await submit({ entryPoint, boop: freezeBoopHashFields(boop) })
            validateOutput(output, submitOutputValidation)
            const [body, code] = makeResponse(output)
            return c.json(body, code)
        },
    )
    .post(
        "/execute", //
        executeDescription,
        executeBodyValidation,
        async (c) => {
            const { entryPoint, boop, timeout } = c.req.valid("json")
            const output = await execute({ entryPoint, boop: freezeBoopHashFields(boop), timeout })
            validateOutput(output, executeOutputValidation)
            const [body, code] = makeResponse(output)
            return c.json(body, code)
        },
    )
    .get(
        "/state/:boopHash", //
        getStateDescription,
        getStateParamValidation,
        async (c) => {
            const { boopHash } = c.req.valid("param")
            const output = await getState({ boopHash })
            validateOutput(output, getStateOutputValidation)
            const [body, code] = makeResponse(output)
            return c.json(body, code)
        },
    )
    .get(
        "/receipt/:boopHash", //
        waitForReceiptDescription,
        waitForReceiptParamValidation,
        waitForReceiptQueryValidation,
        async (c) => {
            const { boopHash } = c.req.valid("param")
            const { timeout } = c.req.valid("query")
            const output = await waitForReceipt({ boopHash, timeout })
            validateOutput(output, waitForReceiptOutputValidation)
            const [body, code] = makeResponse(output)
            return c.json(body, code)
        },
    )
    .get(
        "/pending/:account", //
        getPendingDescription,
        getPendingParamValidation,
        async (c) => {
            const { account } = c.req.valid("param")
            const output = await getPending({ account })
            validateOutput(output, getPendingOutputValidation)
            const [response, code] = makeResponse(output)
            return c.json(response, code)
        },
    )
