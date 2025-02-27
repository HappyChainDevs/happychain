import { submitterClient } from "#src/clients"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { EntryPointStatus, SimulatedValidationStatus } from "#src/tmp/interface/status"
import type { EstimateGasOutput } from "#src/tmp/interface/submitter_estimateGas"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"

export async function estimateGas(data: { entryPoint: `0x${string}`; tx: HappyTx }) {
    const account = findExecutionAccount(data.tx)

    const estimates = await submitterClient.estimateSubmitGas({
        account,
        address: data.entryPoint,
        args: [encodeHappyTx(data.tx)],
    })

    return {
        simulationResult: {
            status: EntryPointStatus.Success,
            validationStatus: SimulatedValidationStatus.Success,
            entryPoint: data.entryPoint,
        },
        executeGasLimit: estimates.executeGasLimit,
        gasLimit: estimates.gasLimit,
        maxFeePerGas: estimates.maxFeePerGas,
        submitterFee: estimates.submitterFee,
        status: EntryPointStatus.Success,
    } satisfies EstimateGasOutput
}
