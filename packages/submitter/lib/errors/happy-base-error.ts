export abstract class HappyBaseError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options)
        this.name = this.constructor.name
    }

    abstract getResponseData(): Record<string, unknown>
}
