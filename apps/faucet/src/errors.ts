import type { ContentfulStatusCode } from "hono/utils/http-status"

export abstract class HappyFaucetError extends Error {
    public readonly statusCode: ContentfulStatusCode

    constructor(statusCode: ContentfulStatusCode, message?: string, options?: ErrorOptions) {
        super(message, options)
        this.name = this.constructor.name
        this.statusCode = statusCode
    }
}

export class FaucetUnexpectedError extends HappyFaucetError {
    constructor(message?: string, options?: ErrorOptions) {
        super(500, message || "Unexpected error", options)
    }
}

export class FaucetFetchError extends HappyFaucetError {
    constructor(message?: string, options?: ErrorOptions) {
        super(500, message || "Unexpected error", options)
    }
}

export class FaucetRateLimitError extends HappyFaucetError {
    constructor(message?: string, options?: ErrorOptions) {
        super(429, message || "Rate limit exceeded", options)
    }
}

export class FaucetCaptchaError extends HappyFaucetError {
    constructor(message?: string, options?: ErrorOptions) {
        super(403, message || "Captcha verification failed on the faucet service", options)
    }
}
