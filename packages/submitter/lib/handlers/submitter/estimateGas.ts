import { submitterClient } from "#lib/clients"
import { deployment } from "#lib/deployments"
import { happySimulationService } from "#lib/services"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { SubmitterErrorStatus, isEntryPointStatus, isSubmitterError } from "#lib/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#lib/tmp/interface/submitter_estimateGas"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { computeHappyTxHash } from "#lib/utils/getHappyTxHash"

export async function estimateGas(data: EstimateGasInput): Promise<EstimateGasOutput> {
    const entryPoint = data.entryPoint ?? deployment.HappyEntryPoint
    const account = findExecutionAccount(data.tx)

    const estimates = await submitterClient.estimateSubmitGas(account, entryPoint, encodeHappyTx(data.tx))

    const happyTxHash = computeHappyTxHash(data.tx as HappyTx)
    // TODO these simulations are not evergreen (state changes) so we have to refresh them
    // TODO it's unclear how the simulation result exists at this stage — will investigate but
    //      I'm guessing it's a side-effect of estimateSubmitGas?
    const simulationResult = await happySimulationService.findResultByHappyTxHash(happyTxHash)

    if (simulationResult && isEntryPointStatus(simulationResult.status)) {
        return {
            status: simulationResult.status,
            simulationResult: isSubmitterError(simulationResult.status) ? simulationResult : undefined,
            maxFeePerGas: estimates.maxFeePerGas,
            submitterFee: estimates.submitterFee,
            executeGasLimit: estimates.executeGasLimit,
            gasLimit: estimates.gasLimit,
        } satisfies EstimateGasOutput
    }

    if (simulationResult && isSubmitterError(simulationResult.status)) {
        return { status: simulationResult.status } satisfies EstimateGasOutput
    }

    return { status: SubmitterErrorStatus.UnexpectedError } satisfies EstimateGasOutput
}
