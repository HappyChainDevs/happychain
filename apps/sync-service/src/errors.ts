import type { ContentfulStatusCode } from "hono/utils/http-status"

export abstract class HappySettingsError extends Error {
    public readonly statusCode: ContentfulStatusCode

    constructor(statusCode: ContentfulStatusCode, message?: string, options?: ErrorOptions) {
        super(message, options)
        this.name = this.constructor.name
        this.statusCode = statusCode
    }
}
