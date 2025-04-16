import env from "#lib/env"
import { SubmitterErrorStatus, isSubmitterError } from "#lib/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#lib/tmp/interface/submitter_estimateGas"
import { encodeBoop } from "#lib/utils/encodeBoop"
import { simulateBoop } from "./simulateBoop"

export async function simulate(data: EstimateGasInput): Promise<EstimateGasOutput> {
    const entryPoint = data.entryPoint ?? env.DEPLOYMENT_ENTRYPOINT

    const simulation = await simulateBoop(entryPoint, encodeBoop(data.tx))

    const maxFeePerGas = 1200000000n
    const submitterFee = 100n

    if (simulation.isOk()) {
        return {
            status: simulation.value.simulation.status,
            simulationResult: simulation.value.simulation,
            maxFeePerGas,
            submitterFee,

            validateGasLimit: BigInt(simulation.value.result.validateGas),
            validatePaymentGasLimit: BigInt(simulation.value.result.paymentValidateGas),
            executeGasLimit: BigInt(simulation.value.result.executeGas),
            gasLimit: BigInt(simulation.value.result.gas),
        } satisfies EstimateGasOutput
    }

    if (!simulation.error.simulation || isSubmitterError(simulation.error.simulation.status)) {
        return {
            status: simulation.error.simulation?.status ?? SubmitterErrorStatus.UnexpectedError,
            simulationResult: simulation.error.simulation,
        } as EstimateGasOutput
    }

    return {
        status: simulation.error.simulation.status,
        simulationResult: simulation.error.simulation,
    } as EstimateGasOutput
}
