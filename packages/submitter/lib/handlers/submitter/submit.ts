import type { happyChainSepolia } from "@happy.tech/wallet-common"
import { type Result, err, ok } from "neverthrow"
import type { Account, WriteContractParameters } from "viem"
import { parseAccount } from "viem/accounts"
import { walletClient } from "#lib/clients"
import { abis, deployment } from "#lib/deployments"
import { UnknownError } from "#lib/errors/contract-errors"
import { parseFromViemError } from "#lib/errors/utils"
import { submitterService } from "#lib/services"
import { checkFutureNonce, incrementLocalNonce, waitUntilUnblocked } from "#lib/services/nonceManager"
import { type SubmitInput, type SubmitOutput, SubmitSuccess } from "#lib/tmp/interface/submitter_submit"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { type SimulateResponseErr, simulateSubmit } from "./simulate"

export async function submit(data: SubmitInput): Promise<Result<SubmitOutput, Error | SimulateResponseErr>> {
    const entryPoint = data.entryPoint ?? deployment.HappyEntryPoint
    // Save original tx to the database for historic purposes and data recovery

    await submitterService.initialize(entryPoint, data.tx)

    const account = findExecutionAccount(data.tx)

    let simulate = await simulateSubmit({
        address: entryPoint,
        args: [encodeHappyTx(data.tx)],
        account,
    })

    // Simulation failed, we can abort the transaction
    if (simulate.isErr()) return err(simulate.error)

    // @note: we could check {simulate.simulation.validationStatus === SimulatedValidationStatus.FutureNonce}
    // however it isn't really needed as we need to compare with the local nonce anyways,
    // (potentially fetching from onchain)
    if (await checkFutureNonce(data.tx)) {
        const resp = await waitUntilUnblocked(data.tx)
        if (resp.isErr()) return err(resp.error)

        simulate = await simulateSubmit({ address: entryPoint, args: [encodeHappyTx(data.tx)], account })
        if (simulate.isErr()) return err(simulate.error)
    }

    // use simulated result instead of the original tx as it may have updated gas values
    const writeResponse = await submitWriteContract(simulate.value.request)

    if (writeResponse.isErr()) return writeResponse

    // Increment the localNonce so the next tx can be executed (if available)
    incrementLocalNonce(data.tx)
    submitterService.finalizeWhenReady(data.tx, writeResponse.value.hash as `0x${string}`)

    // TODO: if status is success and we have hash, however simulation call_reverted
    return ok(writeResponse.value)
}

export async function submitWriteContract(
    request: Omit<SubmitWriteParameters, "abi" | "functionName">,
): Promise<Result<SubmitOutput, Error>> {
    const { account: account_, ...params } = request
    if (!account_) return err(new Error("submit"))
    const account = account_ ? parseAccount(account_) : null

    try {
        const transactionHash = await walletClient.writeContract({
            ...params,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        } as WriteContractParameters)

        return ok({
            status: SubmitSuccess,
            hash: transactionHash,
        })

        // submitterService.finalizeWhenReady(decodeHappyTx(params.args[0]), transactionHash)

        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } catch (_err: any) {
        return err(parseFromViemError(_err) || new UnknownError(_err?.message || "Failed to simulate contract"))
    }
}
type SubmitWriteParameters = WriteContractParameters<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    Account
>
