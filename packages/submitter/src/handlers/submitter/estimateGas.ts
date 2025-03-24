import type { Prettify } from "@happy.tech/common"
import { submitterClient } from "#src/clients"
import { happySimulationService } from "#src/services"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { SubmitterErrorStatus, isEntryPointStatus, isSubmitterError } from "#src/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#src/tmp/interface/submitter_estimateGas"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"

export async function estimateGas(
    data: Prettify<EstimateGasInput & { entryPoint: `0x${string}` }>,
): Promise<EstimateGasOutput> {
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
