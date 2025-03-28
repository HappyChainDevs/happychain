import { submitterClient } from "#lib/clients"
import { happySimulationService } from "#lib/services"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { SubmitterErrorStatus, isEntryPointStatus, isSubmitterError } from "#lib/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#lib/tmp/interface/submitter_estimateGas"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash.ts"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"

export async function estimateGas(data: EstimateGasInput & { entryPoint: `0x${string}` }): Promise<EstimateGasOutput> {
    const account = findExecutionAccount(data.tx)

    const estimates = await submitterClient.estimateSubmitGas({
        account,
        address: data.entryPoint,
        args: [encodeHappyTx(data.tx)],
    })

    const happyTxHash = computeHappyTxHash(data.tx as HappyTx)
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
