import { EntryPointStatus } from "#lib/tmp/interface/status"
import { HappyBaseError } from "./happy-base-error"

export class UnknownError extends HappyBaseError {
    constructor(public message: string) {
        super()
    }

    getResponseData() {
        return { status: "Unknown", message: this.message }
    }
}

/**
 * Failed errors occur when one of our checks have failed
 */
class BaseFailedError extends HappyBaseError {
    constructor(
        // check with `isFailure(status)`
        public status:
            | EntryPointStatus.ValidationFailed
            | EntryPointStatus.ExecuteFailed
            | EntryPointStatus.PaymentFailed,

        /** The revert data *carried* by the returned custom error. */
        public revertData?: string,
    ) {
        super()
    }

    getResponseData() {
        return {
            status: this.status,
            revertData: this.revertData,
        }
    }
}

/**
 * Revert Errors occur when code execution causes a revert
 */
class BaseRevertedError extends HappyBaseError {
    constructor(
        // check with `isRevert(status)`
        public status:
            | EntryPointStatus.ValidationReverted
            | EntryPointStatus.ExecuteReverted
            | EntryPointStatus.PaymentValidationReverted
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

// === FAILED ERRORS ===============================================================================

export class ValidationFailedError extends BaseFailedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.ValidationFailed, revertData)
    }
}

export class ExecuteFailedError extends BaseFailedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.ExecuteFailed, revertData)
    }
}

export class PaymentFailedError extends BaseFailedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.PaymentFailed, revertData)
    }
}

// === REVERT ERRORS ===============================================================================

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

export class PaymentValidationRevertedError extends BaseRevertedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.PaymentValidationReverted, revertData)
    }
}

export class UnexpectedRevertedError extends BaseRevertedError {
    constructor(revertData?: string) {
        super(EntryPointStatus.UnexpectedReverted, revertData)
    }
}
