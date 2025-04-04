import env from "#lib/env"
import { SubmitterErrorStatus } from "#lib/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#lib/tmp/interface/submitter_estimateGas"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { simulateBoop } from "./simulateBoop"

export async function simulate(data: EstimateGasInput): Promise<EstimateGasOutput> {
    const entryPoint = data.entryPoint ?? env.DEPLOYMENT_ENTRYPOINT

    const simulation = await simulateBoop(entryPoint, encodeHappyTx(data.tx))

    if (simulation.isOk()) {
        return {
            status: simulation.value.simulation.status,
            simulationResult: simulation.value.simulation,
            maxFeePerGas: 1200000000n,
            submitterFee: 100n,

            validateGasLimit: BigInt(simulation.value.result.validateGas),
            validatePaymentGasLimit: BigInt(simulation.value.result.paymentValidateGas),
            executeGasLimit: BigInt(simulation.value.result.executeGas),
            gasLimit: BigInt(simulation.value.result.gas),
        } satisfies EstimateGasOutput
    }

    return { status: SubmitterErrorStatus.UnexpectedError } satisfies EstimateGasOutput
}
