import { type Result, ResultAsync, err, ok } from "neverthrow"
import { z } from "zod"
import { FaucetCaptchaError, type FaucetFetchError } from "../errors"
import { mapFetchError } from "../utils"

export const siteVerifyResponseSchema = z.object({
    success: z.boolean(),
})

export class CloudflareService {
    private readonly secret: string

    constructor(secret: string) {
        this.secret = secret
    }

    async verifyTurnstile(token: string): Promise<Result<undefined, FaucetCaptchaError | FaucetFetchError>> {
        const verifyRes = await ResultAsync.fromPromise(
            fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                method: "POST",
                body: new URLSearchParams({
                    secret: this.secret,
                    response: token,
                }),
            }),
            (error) => mapFetchError(error),
        )

        if (verifyRes.isErr()) {
            return err(verifyRes.error)
        }

        const verifyData = await verifyRes.value.json()
        const parsedData = siteVerifyResponseSchema.safeParse(verifyData)

        if (!parsedData.success) {
            return err(new FaucetCaptchaError())
        }

        return ok(undefined)
    }
}
