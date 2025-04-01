import type { Account, Address, Chain, Hex, SimulateContractParameters } from "viem"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import { getSelectorFromErrorName } from "#lib/errors/parsedCodes"
import { parseFromViemError } from "#lib/errors/utils"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus } from "#lib/tmp/interface/status"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { computeHappyTxHash } from "#lib/utils/getHappyTxHash"

/**
 * Typescript version of the CallStatus type from HappyEntryPoint.sol — refer there for
 * documentation.
 */
export enum CallStatus {
    SUCCEEDED = 0,
    CALL_REVERTED = 1,
    EXECUTE_FAILED = 2,
    EXECUTE_REVERTED = 3,
}

/**
 * Typescript version of the SubmitOutput type from HappyEntryPoint.sol — refer there for
 * documentation.
 */
export type SubmitOutput = {
    gas: bigint
    executeGas: bigint
    validationStatus: Hex
    callStatus: CallStatus
    revertData: Hex
    payoutStatus: Hex
}

export async function simulateSubmit(
    account: Account,
    entryPoint: Address,
    encodedHappyTx: Hex,
): Promise<SimulationResult> {
    let request = {
        // enable simulation mode by setting the sender to the zero address
        account: parseAccount(zeroAddress),
        address: entryPoint,
        args: [encodedHappyTx],
        abi: abis.HappyEntryPoint,
        functionName: "submit",
    } as SubmitParameters

    const tx = decodeHappyTx(request.args[0])
    const happyTxHash = computeHappyTxHash(tx)

    // TODO: temp fix to inject high gas limits if values are zero (contract bug, should be fixed soon)
    request = hotfixRequest(tx, request)

    try {
        const { result } = await publicClient.simulateContract(request)
        const status = getEntryPointStatusFromCallStatus(result.callStatus)
        const validationStatus = getValidationStatus(Number(result.validationStatus))

        // assert(!isIllegalRevert(status))

        const out: SimulationResult = {
            entryPoint,
            status,
            validationStatus,
            revertData: "0x",
        }

        switch (status) {
            case EntryPointStatus.CallReverted:
            case EntryPointStatus.ExecuteReverted:
            case EntryPointStatus.ExecuteFailed:
                // TODO: ExecuteFailed does not exist in the contracts on the current commit
                out.revertData = result.revertData
        }

        return out
    } catch (_err) {
        throw parseFromViemError(_err) || _err
        // TODO TODO TODO — parse instances of HappyBaseError & return proper SimulationResult for
        //      each instead of throwing
    }
}

type SubmitParameters = SimulateContractParameters<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    Chain,
    undefined,
    Account
>

function hotfixRequest(tx: HappyTx, request: SubmitParameters): SubmitParameters {
    const needsGasHotfix = tx.paymaster !== tx.account && !tx.gasLimit && !tx.executeGasLimit

    if (needsGasHotfix) {
        const args: readonly [Hex] = [encodeHappyTx({ ...tx, gasLimit: 4000000000n, executeGasLimit: 4000000000n })]
        request = { ...request, args }
    }
    return request
}

function getEntryPointStatusFromCallStatus(callStatus: number): EntryPointStatus {
    switch (callStatus) {
        case CallStatus.SUCCEEDED:
            return EntryPointStatus.Success
        case CallStatus.CALL_REVERTED:
            return EntryPointStatus.CallReverted
        case CallStatus.EXECUTE_FAILED:
            return EntryPointStatus.ExecuteFailed
        case CallStatus.EXECUTE_REVERTED:
            return EntryPointStatus.ExecuteReverted
        default:
            throw new Error(`implementation error: unknown call status: ${callStatus}`)
    }
}

function getValidationStatus(validationStatus: number): SimulatedValidationStatus {
    switch (validationStatus) {
        case 0:
            return SimulatedValidationStatus.Success
        case Number(getSelectorFromErrorName("UnknownDuringSimulation")):
            return SimulatedValidationStatus.Unknown
        case Number(getSelectorFromErrorName("FutureNonceDuringSimulation")):
            return SimulatedValidationStatus.FutureNonce
        default:
            return SimulatedValidationStatus.Failed
    }
}
