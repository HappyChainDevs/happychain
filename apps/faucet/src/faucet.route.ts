import { isAddress } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import type { Context } from "hono"
import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator } from "hono-openapi/zod"
import type { BlankEnv } from "hono/types"
import { err } from "neverthrow"
import { z } from "zod"
import { env } from "./env"
import { cloudflareService } from "./services/cloudflare"
import { faucetService } from "./services/faucet"
import { makeResponse } from "./utils"

type Request = {
    json: {
        address: Address
        cfToken: string
    }
}

export const inputSchema = z.object({
    address: z.string().refine(isAddress),
    cfToken: z.string(),
})

export const outputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
})

export type FaucetInput = z.infer<typeof inputSchema>
export type FaucetOutput = z.infer<typeof outputSchema>

export const validation = validator("json", inputSchema)

export const description = describeRoute({
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

export const faucetHandler = async (c: Context<BlankEnv, "/faucet", { in: Request; out: Request }>) => {
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
}
