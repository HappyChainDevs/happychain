import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { prettyJSON } from "hono/pretty-json"

import type { Address, Hex } from "viem"

import { localhost } from "viem/chains"
import { account, walletClient } from "./utils/clients"
import { DeployAccountSchema, HappyTxSchema } from "./utils/requestSchema"

const app = new Hono()

app.use(prettyJSON())
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

// Routes
app.post("/deployAccount", zValidator("json", DeployAccountSchema), async (c) => {
    const { factoryAddress, salt } = c.req.valid("json")
    // Implementation will be added later
    return c.json({
        success: true,
        message: `Deployment initiated with factory ${factoryAddress} and salt ${salt}`,
    })
})

app.post("/submitHappyTx", zValidator("json", HappyTxSchema), async (c) => {
    // const { encodedTx } = c.req.valid("json")
    // const hash = await walletClient.sendTransaction({
    //   to: "0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd" as Address,
    //   value: 0n,
    //   data: encodedTx as Hex,
    //   account: account,
    //   chain: localhost,
    // })

    const hash = "0xabcdabcd"

    return c.json({
        success: true,
        txHash: hash,
    })
})

export default app
