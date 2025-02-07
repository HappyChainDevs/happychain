import type { EstimateGasInput, EstimateGasOutput } from "#src/tmp/interface/submitter_estimateGas"
import type { ExecuteInput } from "#src/tmp/interface/submitter_execute"
import type { BasicClient } from "../types"
import { submitterEstimateGas } from "./submitter_estimateGas"
import { type ExecuteOutput, submitterExecute } from "./submitter_execute"

export type SubmitterActions = {
    submitterEstimateGas: (args: EstimateGasInput) => Promise<EstimateGasOutput>
    submitterExecute: (args: ExecuteInput) => Promise<ExecuteOutput>
}

export function submitterActions(client: BasicClient): SubmitterActions {
    return {
        submitterEstimateGas: (args) => submitterEstimateGas(client, args),
        submitterExecute: (args) => submitterExecute(client, args),
    }
}
