import { Hono } from "hono";
import { serve } from "@hono/node-server"
import { resolver } from "hono-openapi/zod"
import { validator  } from "hono-openapi/zod"
import { z } from "zod";
import { isAddress } from "@happy.tech/common";
import { describeRoute } from "hono-openapi"
import { TransactionManager } from "@happy.tech/txm";
import { env } from "./env";

const inputSchema = z.object({
    address: z.string().refine(isAddress)
})


const outputSchema = z.object({
    success: z.boolean(),
    message: z.string()
})


const description = describeRoute({
    description: "Faucet endpoint",
    responses: {
        200: {
            description: "Successfully sent tokens",
            content: {
                "application/json": {
                    schema: resolver(outputSchema)
                }
            }
        }
    }
})

const validation = validator("json", inputSchema)



const app = new Hono();

const txm = new TransactionManager({
    rpc: {
        url: env.RPC_URL,
    },
    chainId: env.CHAIN_ID,
    blockTime: env.BLOCK_TIME,
    privateKey: env.PRIVATE_KEY,
    abis: {},
    gas: {}
})

app.get("/", (c) => c.text("Welcome to the Faucet Service!"));

app.post("/faucet", validation, description, (c) => {
    const { address } = c.req.valid("json");
    return c.json({ success: true, message: `Tokens sent to ${address}` });
});


serve({
    fetch: app.fetch,
    port: 3000
});
