import { HappyBaseError } from "./happy-base-error"

/** Submitter errors, unintended states, validation failures, etc */
export class SubmitterError extends HappyBaseError {
    getResponseData(): Record<string, unknown> {
        return {
            status: this.name,
            message: this.message,
        }
    }
}

export class InvalidTransactionRecipientError extends SubmitterError {
    constructor(happyTxHash: `0x${string}`) {
        super(`Invalid Receipt To - ${happyTxHash}`)
    }
}
export class InvalidTransactionTypeError extends SubmitterError {
    constructor(happyTxHash: `0x${string}`) {
        super(`Invalid Receipt Type - ${happyTxHash}`)
    }
}
