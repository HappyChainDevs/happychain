import type { Hex } from "viem"
import { EntryPointStatus } from "#src/tmp/interface/status"

export abstract class HappyBaseError extends Error {
    constructor() {
        super()
        this.name = this.constructor.name
    }

    abstract getResponseData(): Record<string, unknown>
}

export class BaseFailedError extends HappyBaseError {
    constructor(
        // check with `isFailure(status)`
        public status:
            | EntryPointStatus.ValidationFailed
            | EntryPointStatus.ExecuteFailed
            | EntryPointStatus.PaymentFailed,

        /** The selector of the returned custom error. */
        public failureReason?: Hex,

        /** The revert data *carried* by the returned custom error. */
        public revertData?: Hex,
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
    constructor(failureReason?: Hex, revertData?: Hex) {
        super(EntryPointStatus.ValidationFailed, failureReason, revertData)
    }
}

export class ExecuteFailedError extends BaseFailedError {
    constructor(failureReason?: Hex, revertData?: Hex) {
        super(EntryPointStatus.ExecuteFailed, failureReason, revertData)
    }
}

export class PaymentFailedError extends BaseFailedError {
    constructor(failureReason?: Hex, revertData?: Hex) {
        super(EntryPointStatus.PaymentFailed, failureReason, revertData)
    }
}

// Revert Errors
export class BaseRevertedError extends HappyBaseError {
    constructor(
        // check with `isRevert(status)`
        public status:
            | EntryPointStatus.ValidationReverted
            | EntryPointStatus.ExecuteReverted
            | EntryPointStatus.PaymentReverted
            | EntryPointStatus.UnexpectedReverted,

        /** The revertData of the revert error. */
        public revertData?: Hex,
    ) {
        super()
    }

    getResponseData() {
        return { status: this.status, revertData: this.revertData }
    }
}

export class ValidationRevertedError extends BaseRevertedError {
    constructor(revertData?: Hex) {
        super(EntryPointStatus.ValidationReverted, revertData)
    }
}

export class ExecuteRevertedError extends BaseRevertedError {
    constructor(revertData?: Hex) {
        super(EntryPointStatus.ExecuteReverted, revertData)
    }
}

export class PaymentRevertedError extends BaseRevertedError {
    constructor(revertData?: Hex) {
        super(EntryPointStatus.PaymentReverted, revertData)
    }
}

export class UnexpectedRevertedError extends BaseRevertedError {
    constructor(revertData?: Hex) {
        super(EntryPointStatus.UnexpectedReverted, revertData)
    }
}
