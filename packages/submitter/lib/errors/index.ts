import { EntryPointStatus } from "#lib/tmp/interface/status"

export abstract class HappyBaseError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options)
        this.name = this.constructor.name
    }

    abstract getResponseData(): Record<string, unknown>
}

export class UnknownError extends HappyBaseError {
    constructor(public message: string) {
        super()
    }

    getResponseData() {
        return { status: "Unknown", message: this.message }
    }
}

// === FAILED ERRORS ===============================================================================

/**
 * Failed errors occur when one of our checks have failed
 */
export class BaseFailedError extends HappyBaseError {
    constructor(
        // check with `isFailure(status)`
        public status:
            | EntryPointStatus.ValidationFailed
            | EntryPointStatus.ExecuteFailed
            | EntryPointStatus.PaymentFailed,

        /** The selector of the returned custom error. */
        public failureReason?: string,

        /** The revert data *carried* by the returned custom error. */
        public revertData?: string,
    ) {
        super()
    }

    getResponseData() {
        return {
            status: this.status,
            failureReason: this.failureReason,
            revertData: this.revertData,
        }
    }
}

export class ValidationFailedError extends BaseFailedError {
    constructor(failureReason?: string, revertData?: string) {
        super(EntryPointStatus.ValidationFailed, failureReason, revertData)
    }
}

export class ExecuteFailedError extends BaseFailedError {
    constructor(failureReason?: string, revertData?: string) {
        super(EntryPointStatus.ExecuteFailed, failureReason, revertData)
    }
}

export class PaymentFailedError extends BaseFailedError {
    constructor(failureReason?: string, revertData?: string) {
        super(EntryPointStatus.PaymentFailed, failureReason, revertData)
    }
}

// === REVERT ERRORS ===============================================================================

/**
 * Revert Errors occur when code execution causes a revert
 */
export class BaseRevertedError extends HappyBaseError {
    constructor(
        // check with `isRevert(status)`
        public status:
            | EntryPointStatus.ValidationReverted
            | EntryPointStatus.ExecuteReverted
            | EntryPointStatus.PaymentReverted
            | EntryPointStatus.UnexpectedReverted,

        /** The revertData of the revert error. */
        public revertData?: string,
    ) {
        super()
    }

    getResponseData() {
        return { status: this.status, revertData: this.revertData }
    }
}

export class ValidationRevertedError extends BaseRevertedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.ValidationReverted, revertData)
    }
}

export class ExecuteRevertedError extends BaseRevertedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.ExecuteReverted, revertData)
    }
}

export class PaymentRevertedError extends BaseRevertedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.PaymentReverted, revertData)
    }
}

export class UnexpectedRevertedError extends BaseRevertedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.UnexpectedReverted, revertData)
    }
}
