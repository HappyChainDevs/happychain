import { type Result, err, ok } from "neverthrow"
import { z } from "zod"
import { FaucetCaptchaError, FaucetUnexpectedError } from "../errors"

export const siteVerifyResponseSchema = z.object({
    success: z.boolean(),
})

export class CloudflareService {
    private readonly secret: string

    constructor(secret: string) {
        this.secret = secret
    }

    async verifyTurnstile(token: string): Promise<Result<undefined, Error>> {
        try {
            const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                method: "POST",
                body: new URLSearchParams({
                    secret: this.secret,
                    response: token,
                }),
            })

            if (!verifyRes.ok) {
                return err(new FaucetUnexpectedError())
            }

            const verifyData = await verifyRes.json()
            const parsedData = siteVerifyResponseSchema.safeParse(verifyData)

            if (!parsedData.success) {
                return err(new FaucetCaptchaError())
            }

            return ok(undefined)
        } catch (error: unknown) {
            if (error instanceof Error) {
                return err(error)
            }
            return err(new FaucetUnexpectedError())
        }
    }
}
