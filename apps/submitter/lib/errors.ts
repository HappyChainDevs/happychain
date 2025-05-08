export abstract class HappyBaseError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options)
        this.name = this.constructor.name
    }

    abstract getResponseData(): Record<string, unknown>
}

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
    constructor(boopHash: `0x${string}`) {
        super(`Invalid Receipt To - ${boopHash}`)
    }
}
