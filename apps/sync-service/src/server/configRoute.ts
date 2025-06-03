import { Hono } from "hono"
import { stream, streamSSE } from "hono/streaming"
import { createConfig } from "../handlers/createConfig/createConfig"
import { createConfigDescription, createConfigValidation } from "../handlers/createConfig/validation"
import { deleteConfig } from "../handlers/deleteConfig/deleteConfig"
import { deleteConfigDescription, deleteConfigValidation } from "../handlers/deleteConfig/validation"
import { listConfig, listConfigDescription, listConfigValidation } from "../handlers/listConfig"
import { subscribe } from "../handlers/subscribe/subscribe"
import { subscribeDescription, subscribeValidation } from "../handlers/subscribe/validation"
import { updateConfig } from "../handlers/updateConfig/updateConfig"
import { updateConfigDescription, updateConfigValidation } from "../handlers/updateConfig/validation"
import { makeResponse } from "./makeResponse"

export default new Hono()
    .post("/create", createConfigDescription, createConfigValidation, async (c) => {
        const input = c.req.valid("json")
        const result = await createConfig(input)

        const [response, code] = makeResponse(result)
        return c.json(response, code)
    })
    .get("/list", listConfigDescription, listConfigValidation, async (c) => {
        const input = c.req.valid("query")
        const output = await listConfig(input)

        const [response, code] = makeResponse(output)
        return c.json(response, code)
    })
    .put("/update", updateConfigDescription, updateConfigValidation, async (c) => {
        const input = c.req.valid("json")
        const result = await updateConfig(input)

        const [response, code] = makeResponse(result)
        return c.json(response, code)
    })
    .delete("/delete", deleteConfigDescription, deleteConfigValidation, async (c) => {
        const input = c.req.valid("json")
        const result = await deleteConfig(input)

        const [response, code] = makeResponse(result)
        return c.json(response, code)
    })
    .get("/subscribe", subscribeDescription, subscribeValidation, async (c) => {
        c.header("Access-Control-Allow-Origin", "*")
        const input = c.req.valid("query")
        return streamSSE(c, async (s) => {
            await subscribe(input, s)
        })
    })
