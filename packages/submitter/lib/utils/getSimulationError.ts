import type { BaseError, ContractFunctionRevertedError } from "viem"
import { decodeViemError } from "#lib/errors/utils"
import type { SimulationResult } from "#lib/interfaces/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus, isFailure, isRevert } from "#lib/interfaces/status"
import type { SubmitParameters } from "./simulation-interfaces"

export function getSimulationError(req: SubmitParameters, err: unknown): SimulationResult | undefined {
    const entryPoint = req.address
    const raw = ((err as BaseError)?.cause as ContractFunctionRevertedError)?.raw
    const decoded = decodeViemError(err)

    const revertData = decoded?.rawArgs?.[0] || raw || "0x"

    if (decoded && isFailure(decoded.errorName as EntryPointStatus)) {
        return {
            revertData,
            entryPoint,
            status: getEntrypointFailedStatus(decoded),
            validationStatus: SimulatedValidationStatus.Failed,
        } satisfies SimulationResult
    }

    if (decoded && isRevert(decoded.errorName as EntryPointStatus)) {
        return {
            revertData,
            entryPoint,
            status: getEntrypointRevertStatus(decoded),
            validationStatus: SimulatedValidationStatus.Reverted,
        } satisfies SimulationResult
    }

    return {
        revertData: raw,
        entryPoint,
        status: EntryPointStatus.UnexpectedReverted,
        validationStatus: SimulatedValidationStatus.UnexpectedReverted,
    }
}

function getEntrypointFailedStatus({ errorName }: { errorName?: string } = {}) {
    switch (errorName) {
        case "PayoutFailed":
            return EntryPointStatus.PayoutFailed
        case "ValidationFailed":
            return EntryPointStatus.ValidationFailed
        default:
            return EntryPointStatus.ExecuteFailed
    }
}

function getEntrypointRevertStatus({ errorName }: { errorName?: string } = {}) {
    switch (errorName) {
        case "PaymentValidationReverted":
            return EntryPointStatus.PaymentValidationReverted
        case "UnexpectedReverted":
            return EntryPointStatus.UnexpectedReverted
        case "ValidationReverted":
            return EntryPointStatus.ValidationReverted
        default:
            return EntryPointStatus.ExecuteReverted
    }
}
