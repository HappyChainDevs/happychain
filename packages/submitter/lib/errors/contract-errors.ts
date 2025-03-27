/**
 * HappyEntryPoint.sol
 *
 * Global Errors
 *
 * error GasPriceTooHigh();
 * error InvalidNonce();
 * error ValidationReverted(bytes revertData);
 * error ValidationFailed(bytes reason);
 * error PaymentReverted(bytes revertData);
 * error PaymentFailed(bytes result);
 *
 * reverts
 *
 * GasPriceTooHigh()
 * ValidationReverted()
 * ValidationFailed
 * InvalidNonce
 * PaymentReverted
 * PaymentFailed
 *
 * ------------------------------------------
 * Common.sol
 *
 * Global Errors
 *
 * error FutureNonceDuringSimulation();
 * error UnknownDuringSimulation();
 * error NotFromEntryPoint();
 * error InvalidSignature();
 *
 * -----------------------------------------------
 *
 * ScrappyAccount.sol
 *
 *  Instance
 *
 * error NotSelfOrOwner()
 *
 * Reverts
 *
 * error NotFromEntryPoint()
 * error NotSelfOrOwner()
 * error ExtensionAlreadyRegistered(extension, extensionType)
 * error ExtensionNotRegistered(extension, extensionType)
 *
 * Returned Selectors
 * InvalidExtensionValue
 * ExtensionNotRegistered
 * UnknownDuringSimulation
 * InvalidSignature
 */

import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { isFailure, isRevert } from "#lib/tmp/interface/status"
import { HappyBaseError } from "."
import { getErrorNameFromSelector } from "./parsedCodes"

/** Submitter errors, unintended states, validation failures, etc */
export class SubmitterError extends Error {}

/** Errors occurred during simulation */
export class SimulationError extends HappyBaseError {
    errorName: string
    status: string
    validationStatus: string
    entryPoint: string

    constructor(private result: SimulationResult) {
        const errorName =
            getErrorNameFromSelector(result.revertData || "0x") ??
            (isRevert(result.status) ? "Revert" : isFailure(result.status) ? "Failure" : "Unknown")

        super(`[Simulation Error] ${result.validationStatus} => ${errorName}`)

        this.errorName = errorName
        this.status = result.status
        this.validationStatus = result.validationStatus
        this.entryPoint = result.entryPoint
    }

    getResponseData(): Record<string, unknown> {
        return {
            status: this.status,
            validationStatus: this.result.validationStatus,
            failureReason: this.result.failureReason,
            revertData: this.result.revertData && getErrorNameFromSelector(this.result.revertData),
        }
    }
}

/** Errors occurred during execution */
export class ExecuteError extends Error {}
