import { HappyBaseError } from "./happy-base-error"

/** Submitter errors, unintended states, validation failures, etc */
export class SubmitterError extends HappyBaseError {
    constructor(
        public error: string,
        options?: ErrorOptions,
    ) {
        super(error, options)
    }

    getResponseData(): Record<string, unknown> {
        return {
            status: this.name,
            message: this.message,
        }
    }
}

export class TransactionReplacedError extends SubmitterError {
    constructor(
        public txHash: `0x${string}`,
        public replacementTxHash: `0x${string}`,
    ) {
        super(`Transaction ${txHash} replaced by ${replacementTxHash}`)
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
