import { isAddress } from "@happy.tech/common"
import type { Hono } from "hono"
import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator } from "hono-openapi/zod"
import { err } from "neverthrow"
import { z } from "zod"
import { env } from "./env"
import type { CloudflareService } from "./services/cloudflare"
import type { FaucetService } from "./services/faucet"
import { makeResponse } from "./utils"

export const inputSchema = z.object({
    address: z.string().refine(isAddress),
    cfToken: z.string(),
})

export const outputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
})

export type FaucetInput = z.infer<typeof inputSchema>
export type FaucetOutput = z.infer<typeof outputSchema>

export const setupFaucetRoutes = (app: Hono, faucetService: FaucetService, cloudflareService: CloudflareService) => {
    const validation = validator("json", inputSchema)
    const description = describeRoute({
        description: "Faucet endpoint with Cloudflare Turnstile validation",
        responses: {
            200: {
                description: "Tokens sent",
                content: { "application/json": { schema: resolver(outputSchema) } },
            },
            403: {
                description: "Turnstile verification failed",
                content: { "application/json": { schema: resolver(outputSchema) } },
            },
            429: {
                description: "Rate limit exceeded",
                content: { "application/json": { schema: resolver(outputSchema) } },
            },
        },
        validateResponse: env.NODE_ENV !== "production",
    })

    app.post("/faucet", validation, description, async (c) => {
        try {
            const { address, cfToken } = c.req.valid("json")

            const captchaResult = await cloudflareService.verifyTurnstile(cfToken)

            if (captchaResult.isErr()) {
                const response = makeResponse(captchaResult)
                return c.json(response[0], response[1])
            }

            const result = await faucetService.sendTokens(address)

            const response = makeResponse(result)
            return c.json(response[0], response[1])
        } catch (error) {
            const response = makeResponse(err(error))
            return c.json(response[0], response[1])
        }
    })
}
