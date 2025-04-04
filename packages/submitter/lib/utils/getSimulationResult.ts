import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus, isFailure, isRevert } from "#lib/tmp/interface/status"
import type { SubmitParameters, SubmitSimulateResponseOk, SubmitSimulateResults } from "./simulation-interfaces"

export function getSimulationResult(
    request: SubmitParameters,
    result: SubmitSimulateResults,
): SimulationResult | undefined {
    const entryPoint = request.address
    const status = getEntryPointStatusFromCallStatus(result.callStatus)
    const validationStatus = getValidationStatus(result)

    const revertData = result.revertData

    if (status === EntryPointStatus.Success) {
        return {
            status,
            entryPoint,
            validationStatus,
        } satisfies SimulationResult
    }

    if (isFailure(status)) {
        return {
            revertData,
            entryPoint,
            status,
            validationStatus,
        } satisfies SimulationResult
    }

    if (isRevert(status)) {
        return {
            revertData,
            entryPoint,
            status,
            validationStatus,
        } satisfies SimulationResult
    }
}

/**
 * Typescript version of the CallStatus type from HappyEntryPoint.sol — refer there for
 * documentation.
 */
enum CallStatus {
    SUCCEEDED = 0,
    CALL_REVERTED = 1,
    EXECUTE_FAILED = 2,
    EXECUTE_REVERTED = 3,
}

function getEntryPointStatusFromCallStatus(callStatus: number): EntryPointStatus {
    switch (callStatus) {
        case CallStatus.SUCCEEDED:
            return EntryPointStatus.Success
        case CallStatus.CALL_REVERTED:
            return EntryPointStatus.CallReverted
        case CallStatus.EXECUTE_FAILED:
            return EntryPointStatus.ExecuteFailed
        case CallStatus.EXECUTE_REVERTED:
            return EntryPointStatus.ExecuteReverted
        default:
            throw new Error(`implementation error: unknown call status: ${callStatus}`)
    }
}

function getValidationStatus(result: SubmitSimulateResponseOk["result"]): SimulatedValidationStatus {
    switch (true) {
        case result.validityUnknownDuringSimulation:
            return SimulatedValidationStatus.ValidityUnknown
        case result.paymentValidityUnknownDuringSimulation:
            return SimulatedValidationStatus.PaymentValidityUnknown
        case result.futureNonceDuringSimulation:
            return SimulatedValidationStatus.FutureNonce
        case [0, 1].includes(result.callStatus):
            return SimulatedValidationStatus.Success
        default:
            return SimulatedValidationStatus.Failed
    }
}
