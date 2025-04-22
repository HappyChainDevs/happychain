import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Result } from "neverthrow"
import type { Account, SimulateContractReturnType } from "viem"
import { abis } from "#lib/env"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"

export type SubmitSimulateResults = SimulateContractReturnType<
    typeof abis.EntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    undefined,
    undefined,
    Account
>["result"]

export type SubmitParameters = {
    address: `0x${string}`
    args: readonly [`0x${string}`]
}

export type SubmitRequest = SubmitParameters & {
    account: Account
    abi: typeof abis.EntryPoint
    functionName: "submit"
}

export type SubmitSimulateResponseOk = {
    request: SubmitParameters
    result: SubmitSimulateResults
    simulation: SimulationResult
}
export type SubmitSimulateResponseErr = {
    request: SubmitParameters
    result?: SubmitSimulateResults | undefined
    simulation?: SimulationResult | undefined
}

export type SubmitSimulateResult = Result<SubmitSimulateResponseOk, SubmitSimulateResponseErr>
