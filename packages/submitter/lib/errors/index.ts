import type { Hex } from "viem"
import { EntryPointStatus } from "#lib/tmp/interface/status"

export abstract class HappyBaseError extends Error {
    public name: string
    public revertData: Hex
    protected constructor(revertData: Hex) {
        super()
        this.name = this.constructor.name
        this.revertData = revertData
    }

    abstract getResponseData(): Record<string, unknown>
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

        /** The revert data *carried* by the returned custom error. */
        public revertData: Hex,
    ) {
        super(revertData)
    }

    getResponseData() {
        return {
            status: this.status,
            revertData: this.revertData,
        }
    }
}

export class ValidationFailedError extends BaseFailedError {
    constructor(revertData: Hex) {
        super(EntryPointStatus.ValidationFailed, revertData)
    }
}

export class ExecuteFailedError extends BaseFailedError {
    constructor(revertData: Hex) {
        super(EntryPointStatus.ExecuteFailed, revertData)
    }
}

export class PaymentFailedError extends BaseFailedError {
    constructor(revertData: Hex) {
        super(EntryPointStatus.PaymentFailed, revertData)
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
        public revertData: Hex,
    ) {
        super(revertData)
    }

    getResponseData() {
        return { status: this.status, revertData: this.revertData }
    }
}

export class ValidationRevertedError extends BaseRevertedError {
    constructor(revertData: Hex) {
        super(EntryPointStatus.ValidationReverted, revertData)
    }
}

export class ExecuteRevertedError extends BaseRevertedError {
    constructor(revertData: Hex) {
        super(EntryPointStatus.ExecuteReverted, revertData)
    }
}

export class PaymentRevertedError extends BaseRevertedError {
    constructor(revertData: Hex) {
        super(EntryPointStatus.PaymentReverted, revertData)
    }
}

export class UnexpectedRevertedError extends BaseRevertedError {
    constructor(revertData: Hex) {
        super(EntryPointStatus.UnexpectedReverted, revertData)
    }
}
