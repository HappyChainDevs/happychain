import { type Result, err, ok } from "neverthrow"
import { walletClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import env from "#lib/env"
import { UnknownError } from "#lib/errors/contract-errors"
import { parseFromViemError } from "#lib/errors/utils"
import { boopNonceManager, submitterService } from "#lib/services"
import { type SubmitInput, type SubmitOutput, SubmitSuccess } from "#lib/tmp/interface/submitter_submit"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import type { SubmitParameters, SubmitRequest, SubmitSimulateResponseErr } from "#lib/utils/simulation-interfaces"
import { simulateBoop } from "./simulateBoop"

export async function submit(data: SubmitInput): Promise<Result<SubmitOutput, Error | SubmitSimulateResponseErr>> {
    const entryPoint = data.entryPoint ?? env.DEPLOYMENT_ENTRYPOINT
    // Save original tx to the database for historic purposes and data recovery
    await submitterService.initialize(entryPoint, data.tx)

    let simulate = await simulateBoop(entryPoint, encodeHappyTx(data.tx))

    // Simulation failed, we can abort the transaction
    if (simulate.isErr()) return err(simulate.error)

    // @note: we could check {simulate.simulation.validationStatus === SimulatedValidationStatus.FutureNonce}
    // however it isn't really needed as we need to compare with the local nonce anyways,
    // (potentially fetching from onchain)
    if (await boopNonceManager.checkIfBlocked(entryPoint, data.tx)) {
        const resp = await boopNonceManager.pauseUntilUnblocked(entryPoint, data.tx)
        if (resp.isErr()) return err(resp.error)

        // update simulation
        simulate = await simulateBoop(entryPoint, encodeHappyTx(data.tx))
        if (simulate.isErr()) return err(simulate.error)
    }

    // use simulated result instead of the original tx as it may have updated gas values
    const writeResponse = await submitWriteContract(simulate.value.request)

    if (writeResponse.isErr()) return writeResponse

    // Increment the localNonce so the next tx can be executed (if available)
    boopNonceManager.incrementLocalNonce(data.tx)
    submitterService.finalizeWhenReady(data.tx, writeResponse.value.hash as `0x${string}`)

    return ok(writeResponse.value)
}

async function submitWriteContract(request: SubmitParameters): Promise<Result<SubmitOutput, Error>> {
    const account = findExecutionAccount(decodeHappyTx(request.args[0]))

    try {
        const transactionHash = await walletClient.writeContract({
            address: request.address,
            args: request.args,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        } satisfies SubmitRequest)

        return ok({
            status: SubmitSuccess,
            hash: transactionHash,
        })
    } catch (_err: unknown) {
        // @ts-expect-error
        return err(parseFromViemError(_err) || new UnknownError(_err?.message || "Failed to simulate contract"))
    }
}
