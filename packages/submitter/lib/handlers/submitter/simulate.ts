import { type Result, err, ok } from "neverthrow"
import { deployment } from "#lib/env"
import { getSelectorFromErrorName } from "#lib/errors/parsedCodes"
import { boopNonceManager } from "#lib/services"
import type { Boop } from "#lib/tmp/interface/Boop"
import { SubmitterErrorStatus, isSubmitterError } from "#lib/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#lib/tmp/interface/submitter_estimateGas"
import { encodeBoop } from "#lib/utils/encodeBoop"
import { simulateBoop } from "./simulateBoop"

export async function simulate(data: EstimateGasInput): Promise<Result<EstimateGasOutput, EstimateGasOutput>> {
    const entryPoint = data.entryPoint ?? deployment.EntryPoint

    const simulation = await simulateBoop(entryPoint, encodeBoop(data.tx))

    const maxFeePerGas = 1200000000n
    const submitterFee = 100n

    if (simulation.isOk()) {
        return ok({
            status: simulation.value.simulation.status,
            simulationResult: simulation.value.simulation,
            maxFeePerGas,
            submitterFee,

            validateGasLimit: BigInt(simulation.value.result.validateGas),
            validatePaymentGasLimit: BigInt(simulation.value.result.paymentValidateGas),
            executeGasLimit: BigInt(simulation.value.result.executeGas),
            gasLimit: BigInt(simulation.value.result.gas),
        } satisfies EstimateGasOutput)
    }

    if (!simulation.error.simulation || isSubmitterError(simulation.error.simulation.status)) {
        return err({
            status: simulation.error.simulation?.status ?? SubmitterErrorStatus.UnexpectedError,
            simulationResult: simulation.error.simulation,
        } as EstimateGasOutput)
    }

    if (simulation.error.simulation.revertData === getSelectorFromErrorName("InvalidNonce")) {
        // We don't necessarily need to reset the nonce here, but we do it to be safe.
        boopNonceManager.resetLocalNonce(data.tx as Boop)
    }

    return err({
        status: simulation.error.simulation.status,
        simulationResult: simulation.error.simulation,
    } as EstimateGasOutput)
}
