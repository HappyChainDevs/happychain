import { simulateContract } from "viem/actions"
import { HAPPY_ENTRYPOINT_ABI } from "#src/tmp/abis"
import { EntryPointStatus, SimulatedValidationStatus } from "#src/tmp/interface/status"
import type { EstimateGasInput, EstimateGasOutput } from "#src/tmp/interface/submitter_estimateGas"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import type { BasicClient } from "../types"

export async function submitterEstimateGas(
    // TODO: default to our entrypoint (defined in contracts)
    client: BasicClient,
    { entryPoint = "0x0000000000000000000000000000000000000000", tx }: EstimateGasInput,
): Promise<EstimateGasOutput> {
    // Estimate gas using the provider

    // TODO: return error message as to cause
    const { result: _result } = await simulateContract(client, {
        account: "0x0000000000000000000000000000000000000000", // address zero to activate 'simulation mode'
        address: entryPoint,
        args: [encodeHappyTx(tx)],
        functionName: "submit",
        abi: HAPPY_ENTRYPOINT_ABI,
    })

    return DUMMY_RESPONSE
}

const DUMMY_RESPONSE = {
    simulationResult: {
        status: EntryPointStatus.Success,
        validationStatus: SimulatedValidationStatus.Success,
        entryPoint: "0x",
    },
    maxFeePerGas: 0n,
    submitterFee: 0n,
    gasLimit: 0n,
    executeGasLimit: 0n,
    status: EntryPointStatus.Success,
} as const
