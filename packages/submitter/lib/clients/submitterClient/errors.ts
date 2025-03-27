import { SubmitterError } from "#lib/errors/contract-errors"

export class AccountNotFoundError extends SubmitterError {
    constructor(action: string) {
        super(`Account Not Found - ${action}`)
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

export class UnexpectedReceiptStatusError extends SubmitterError {
    constructor(happyTxHash: `0x${string}`, status?: string | undefined) {
        super(`Unexpected Receipt Status - ${happyTxHash} - ${status}`)
    }
}
