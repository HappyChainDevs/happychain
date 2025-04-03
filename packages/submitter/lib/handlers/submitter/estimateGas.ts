import env from "#lib/env"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { SubmitterErrorStatus } from "#lib/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#lib/tmp/interface/submitter_estimateGas"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { simulateSubmit } from "./simulate"

export async function estimateGas(data: EstimateGasInput): Promise<EstimateGasOutput> {
    const entryPoint = data.entryPoint ?? env.DEPLOYMENT_ENTRYPOINT

    const account = findExecutionAccount(data.tx)

    const simulation = await simulateSubmit({
        account,
        address: entryPoint,
        args: [encodeHappyTx(data.tx as HappyTx)],
    })

    if (simulation.isOk()) {
        return {
            status: simulation.value.simulation.status,
            simulationResult: simulation.value.simulation,
            maxFeePerGas: 1200000000n,
            submitterFee: 100n,
            executeGasLimit: BigInt(simulation.value.result.executeGas),
            gasLimit: BigInt(simulation.value.result.gas),
        } satisfies EstimateGasOutput
    }

    return { status: SubmitterErrorStatus.UnexpectedError } satisfies EstimateGasOutput
}
