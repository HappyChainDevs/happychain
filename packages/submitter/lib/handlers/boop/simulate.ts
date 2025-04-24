import { type Result, err, ok } from "neverthrow"
import { deployment } from "#lib/env"
import { getSelectorFromErrorName } from "#lib/errors/parsedCodes"
import type { Boop } from "#lib/interfaces/Boop"
import type { SimulationInput, SimulationOutput } from "#lib/interfaces/boop_simulate"
import { SubmitterErrorStatus, isSubmitterError } from "#lib/interfaces/status"
import { boopNonceManager } from "#lib/services"
import { encodeBoop } from "#lib/utils/encodeBoop"
import { simulateBoop } from "./simulateBoop"

export async function simulate(data: SimulationInput): Promise<Result<SimulationOutput, SimulationOutput>> {
    const entryPoint = data.entryPoint ?? deployment.EntryPoint

    console.log({ entryPoint })
    const simulation = await simulateBoop(entryPoint, encodeBoop(data.tx))
    console.log({ simulation })
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
        } satisfies SimulationOutput)
    }

    if (!simulation.error.simulation || isSubmitterError(simulation.error.simulation.status)) {
        return err({
            status: simulation.error.simulation?.status ?? SubmitterErrorStatus.UnexpectedError,
            simulationResult: simulation.error.simulation,
        } as SimulationOutput)
    }

    if (simulation.error.simulation.revertData === getSelectorFromErrorName("InvalidNonce")) {
        // We don't necessarily need to reset the nonce here, but we do it to be safe.
        boopNonceManager.resetLocalNonce(data.tx as Boop)
    }

    return err({
        status: simulation.error.simulation.status,
        simulationResult: simulation.error.simulation,
    } as SimulationOutput)
}
