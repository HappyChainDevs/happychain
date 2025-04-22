import type { ContentfulStatusCode } from "hono/utils/http-status"

export abstract class HappyFaucetError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options)
        this.name = this.constructor.name
    }

    abstract getStatusCode(): ContentfulStatusCode
}

export class FaucetUnexpectedError extends HappyFaucetError {
    constructor(message?: string, options?: ErrorOptions) {
        super(message ?? "Unexpected error", options)
    }

    getStatusCode(): ContentfulStatusCode {
        return 500
    }
}

export class FaucetRateLimitError extends HappyFaucetError {
    constructor(message?: string, options?: ErrorOptions) {
        super(message ?? "Rate limit exceeded", options)
    }

    getStatusCode(): ContentfulStatusCode {
        return 429
    }
}

export class FaucetCaptchaError extends HappyFaucetError {
    constructor(message?: string, options?: ErrorOptions) {
        super(message ?? "Captcha verification failed", options)
    }

    getStatusCode(): ContentfulStatusCode {
        return 403
    }
}
