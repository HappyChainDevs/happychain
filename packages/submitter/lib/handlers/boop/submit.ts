import type { Hex } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import { walletClient } from "#lib/clients"
import { abis, deployment } from "#lib/env"
import { UnknownError } from "#lib/errors/contract-errors"
import { getContractRevertError } from "#lib/errors/viem"
import type { SimulateOutput, SimulateOutputSuccess } from "#lib/interfaces/boop_simulate"
import { SUBMIT_SUCCESS, type SubmitInput, type SubmitOutput } from "#lib/interfaces/boop_submit"
import { EntryPointStatus } from "#lib/interfaces/status"
import { boopNonceManager, submitterService } from "#lib/services"
import { encodeBoop } from "#lib/utils/encodeBoop"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { simulate } from "./simulate"

export async function submit(input: SubmitInput): Promise<Result<SubmitOutput, Error | SimulateOutput>> {
    const entryPoint = input.entryPoint ?? deployment.EntryPoint
    // Save original tx to the database for historic purposes and data recovery
    await submitterService.initialize(entryPoint, input.boop)

    let simulation = await simulate({ entryPoint, boop: input.boop })

    // TODO can we?
    // Simulation failed, we can abort the transaction.
    if (simulation.status !== EntryPointStatus.Success) return err(simulation)

    const isFutureNonce = simulation.futureNonceDuringSimulation
    if (isFutureNonce && (await boopNonceManager.checkIfBlocked(entryPoint, input.boop))) {
        const resp = await boopNonceManager.pauseUntilUnblocked(entryPoint, input.boop)
        if (resp.isErr()) return err(resp.error)

        // update simulation
        simulation = await simulate({ entryPoint, boop: input.boop })
        if (simulation.status !== EntryPointStatus.Success) return err(simulation)
    }
    // use simulated result instead of the original tx as it may have updated gas values
    const writeResponse = await submitWriteContract(input, simulation)

    if (writeResponse.isErr()) {
        // Unknown error cause, we will reset the local view nonce as a precaution
        boopNonceManager.resetLocalNonce(input.boop)
        return writeResponse
    }

    // Increment the localNonce so the next tx can be executed (if available)
    boopNonceManager.incrementLocalNonce(input.boop)
    submitterService.finalizeWhenReady(input.boop, writeResponse.value.hash as `0x${string}`)

    return ok(writeResponse.value)
}

async function submitWriteContract(
    input: SubmitInput,
    simulation: SimulateOutputSuccess,
): Promise<Result<SubmitOutput, Error>> {
    const account = findExecutionAccount(input.boop)

    // TODO must use simulation data to avoid extra simulation!!!!
    // TODO better parsing / transmission back of errors

    // TODO
    const args: [Hex] = [encodeBoop(input.boop)]
    try {
        // TODO I broke this
        const _viemRequest = await walletClient.prepareTransactionRequest({
            address: input.entryPoint,
            args,
            abi: abis.EntryPoint,
            functionName: "submit",
            gas: BigInt(simulation.gas),
            // maxFeePerGas,
            // maxPriorityFeePerGas,
            account,
        })

        const transactionHash = await walletClient.writeContract({
            address: input.entryPoint ?? deployment.EntryPoint,
            args,
            abi: abis.EntryPoint,
            functionName: "submit",
            gas: BigInt(simulation.gas),
            // maxFeePerGas,
            // maxPriorityFeePerGas,
            account,
        }) // satisfies SubmitRequest)

        return ok({
            status: SubmitSuccess,
            hash: transactionHash,
        })
    } catch (_err: unknown) {
        // @ts-expect-error
        return err(getContractRevertError(_err) || new UnknownError(_err?.message || "Failed to simulate contract"))
    }
}
