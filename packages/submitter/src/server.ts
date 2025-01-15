import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { prettyJSON } from "hono/pretty-json"

import { DeployAccountSchema, HappyTxSchema } from "./utils/requestSchema"
import {abis, deployments} from "@happychain/contracts/happyAccount/anvil"
import { publicClient, walletClient } from "./utils/clients"

const app = new Hono()

app.use(prettyJSON())
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

// Routes
app.post("/deployAccount", zValidator("json", DeployAccountSchema), async (c) => {
    const { owner, salt } = c.req.valid("json")

    const hash = await walletClient.writeContract({
        address: deployments.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "createAccount",
        args: [salt, owner],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== "success") {
        throw new Error("Deployment failed")
    }

    return c.json({
        success: true,
        message: `Deployment initiated with owner ${owner} and salt ${salt}`,
    })
})

app.post("/submitHappyTx", zValidator("json", HappyTxSchema), async (c) => {
    const hash = "0xabcdabcd"

    return c.json({
        success: true,
        txHash: hash,
    })
})

export default app
