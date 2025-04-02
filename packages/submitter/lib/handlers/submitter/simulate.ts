import type { Optional } from "@happy.tech/common"
import type { happyChainSepolia } from "@happy.tech/wallet-common"
import { type Result, err, ok } from "neverthrow"
import type {
    Account,
    BaseError,
    ContractFunctionRevertedError,
    Prettify,
    SimulateContractParameters,
    SimulateContractReturnType,
} from "viem"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import { getSelectorFromErrorName } from "#lib/errors/parsedCodes"
import { decodeViemError } from "#lib/errors/utils"
import { submitterService } from "#lib/services/index"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus, isFailure, isRevert } from "#lib/tmp/interface/status"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"

/**
 * Simulates the contract call. In the event it reverts, it formats as simulationResults,
 * saves to the db, then re-throws the error.
 */
async function simulateContract(
    req: SubmitSimulateParameters,
): Promise<Result<SimulateResponseOk, SimulateResponseErr>> {
    try {
        const { request, result } = await publicClient.simulateContract(req)
        const simulation = getSimulationResult({ request, result })
        await submitterService.insertSimulationResult(
            request as unknown as SubmitSimulateParameters,
            result,
            simulation,
        )
        if (result.callStatus === 0 && simulation) return ok({ request, result, simulation })
        return err({ request, result, simulation })
    } catch (_err) {
        // this should be capable of handling all potential revert errors
        const simulation = parseResultFromError(req, _err)
        await submitterService.insertSimulationResult(req, undefined, simulation)

        const response = {
            request: req as unknown as SubmitSimulateReturnType["request"],
            result: undefined,
            simulation,
        }
        return err(response)
    }
}

function parseResultFromError(req: SubmitSimulateParameters, err: unknown): SimulationResult | undefined {
    const entryPoint = req.address
    const raw = ((err as BaseError)?.cause as ContractFunctionRevertedError)?.raw
    const decoded = decodeViemError(err)
    const revertData = decoded?.rawArgs?.[0] || raw || "0x"

    if (decoded && isFailure(decoded.errorName as EntryPointStatus)) {
        return {
            revertData,
            entryPoint,
            status: getEntrypointFailedStatus(decoded),
            validationStatus: SimulatedValidationStatus.Reverted,
        } satisfies SimulationResult
    }

    if (decoded && isRevert(decoded.errorName as EntryPointStatus)) {
        return {
            revertData,
            entryPoint,
            status: getEntrypointRevertStatus(decoded),
            validationStatus: SimulatedValidationStatus.Reverted,
        } satisfies SimulationResult
    }

    return {
        revertData,
        entryPoint,
        status: EntryPointStatus.UnexpectedReverted,
        validationStatus: SimulatedValidationStatus.Reverted,
    }
}

function getEntrypointFailedStatus({ errorName }: { errorName?: string } = {}) {
    switch (errorName) {
        case "PaymentFailed":
            return EntryPointStatus.PaymentFailed
        case "ValidationFailed":
            return EntryPointStatus.ValidationFailed
        default:
            return EntryPointStatus.ExecuteFailed
    }
}

function getEntrypointRevertStatus({ errorName }: { errorName?: string } = {}) {
    switch (errorName) {
        case "PaymentReverted":
            return EntryPointStatus.PaymentReverted
        case "UnexpectedReverted":
            return EntryPointStatus.UnexpectedReverted
        case "ValidationReverted":
            return EntryPointStatus.ValidationReverted
        default:
            return EntryPointStatus.ExecuteReverted
    }
}

/**
 *
 * @param parameters { address, args, account }
 * @param parameters.address The address of the entrypoint
 * @param parameters.args The encoded happyTx
 * @param parameters.account The execution wallet
 * @returns Result<{ request, result, simulation }, Error>
 */
export async function simulateSubmit(
    parameters: Omit<SubmitSimulateParameters, "abi" | "functionName">,
): Promise<Result<SimulateResponseOk, SimulateResponseErr>> {
    // Simulate with zero address to allow for future nonce simulation

    const params = {
        account: parseAccount(zeroAddress),
        address: parameters.address,
        args: parameters.args,
        abi: abis.HappyEntryPoint,
        functionName: "submit",
    } as SubmitSimulateParameters

    const simulationResult = await simulateContract(params)

    // don't need to process anymore
    if (simulationResult.isErr()) return simulationResult

    const { request, result, simulation } = simulationResult.value

    const args = validateGas(request.args[0], result)

    return ok({
        // restore original account, instead of zeroAddress which was used
        request: {
            ...request,
            // potentially updated gas values
            args: [args],
            // original requesting account
            account: parameters.account ? parseAccount(parameters.account) : undefined,
        } as unknown as typeof request,
        result: {
            gas: result.gas,
            executeGas: result.executeGas,
            // gas: BigInt(result.gas),
            // executeGas: BigInt(result.executeGas),
            validationStatus: result.validationStatus,
            callStatus: result.callStatus,
            revertData: result.revertData,
            payoutStatus: result.payoutStatus,
        },
        simulation,
    })
}

function validateGas(args: `0x${string}`, result: SimulateResponseOk["result"]): `0x${string}` {
    // Update gas limits for the encoded tx if they where previously 0
    const decoded = decodeHappyTx(args)

    const hasSuccessfulGasEstimation = Boolean(result.gas && result.executeGas)
    const needsPaymasterGasFilled = Boolean(
        decoded.paymaster !== decoded.account && !decoded.gasLimit && !decoded.executeGasLimit,
    )
    if (needsPaymasterGasFilled && hasSuccessfulGasEstimation) {
        decoded.gasLimit = BigInt(result.gas) * 10n // TODO: contract simulation gas estimation errors
        decoded.executeGasLimit = BigInt(result.executeGas) * 10n // TODO: this shouldn't need the * 10n
    }

    return encodeHappyTx(decoded)
}

function getSimulationResult({ request, result }: SubmitSimulateReturnType): SimulationResult | undefined {
    const entryPoint = request.address
    const status = getEntryPointStatusFromCallStatus(result.callStatus)
    const validationStatus = getValidationStatus(Number(result.validationStatus))

    const revertData = result.revertData

    if (status === EntryPointStatus.Success) {
        return {
            status,
            entryPoint,
            validationStatus,
        } satisfies SimulationResult
    }

    if (isFailure(status)) {
        return {
            revertData,
            entryPoint,
            status,
            validationStatus,
        } satisfies SimulationResult
    }

    if (isRevert(status)) {
        return {
            revertData,
            entryPoint,
            status,
            validationStatus,
        } satisfies SimulationResult
    }
}

/**
 * Typescript version of the CallStatus type from HappyEntryPoint.sol — refer there for
 * documentation.
 */
enum CallStatus {
    SUCCEEDED = 0,
    CALL_REVERTED = 1,
    EXECUTE_FAILED = 2,
    EXECUTE_REVERTED = 3,
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

type SubmitSimulateParameters = SimulateContractParameters<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    undefined,
    Account
>

type SubmitSimulateReturnType = Prettify<
    SimulateContractReturnType<
        typeof abis.HappyEntryPoint,
        "submit",
        readonly [`0x${string}`],
        typeof happyChainSepolia,
        undefined,
        undefined,
        Account
    >
>

export type SimulateResponseOk = SubmitSimulateReturnType & { simulation: SimulationResult }
export type SimulateResponseErr = Optional<SubmitSimulateReturnType, "result"> & {
    simulation?: SimulationResult | undefined
}
