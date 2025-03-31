import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Address, Hex, SimulateContractParameters, SimulateContractReturnType } from "viem"
import { zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import { parseFromViemError } from "#lib/errors/utils"
import { submitterService } from "#lib/services"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { computeHappyTxHash } from "#lib/utils/getHappyTxHash"

export async function simulateSubmit(
    account: Account,
    entryPoint: Address,
    encodedHappyTx: Hex,
): Promise<SubmitSimulateReturnType> {
    const req = {
        // enable simulation mode by setting the sender to the zero address
        account: parseAccount(zeroAddress),
        address: entryPoint,
        args: [encodedHappyTx],
        abi: abis.HappyEntryPoint,
        functionName: "submit",
    } as SubmitSimulateParameters

    const tx = decodeHappyTx(req.args[0])
    const happyTxHash = computeHappyTxHash(tx)

    const needsGasHotfix = tx.paymaster !== tx.account && !tx.gasLimit && !tx.executeGasLimit
    try {
        const { request, result } = await publicClient.simulateContract(
            // TODO: temp fix to inject high gas limits if values are zero (contract bug, should be fixed soon)
            needsGasHotfix
                ? {
                      ...req,
                      args: [encodeHappyTx({ ...tx, gasLimit: 4000000000n, executeGasLimit: 4000000000n })],
                  }
                : req,
        )

        const simulation = await submitterService.insertSimulationSuccess(happyTxHash, req, result)
        // Update gas limits for the encoded tx if they where previously 0
        const decoded = decodeHappyTx(request.args[0])

        const hasSuccessfulGasEstimation = Boolean(result.gas && result.executeGas)
        const needsPaymasterGasFilled = Boolean(
            decoded.paymaster !== decoded.account && !decoded.gasLimit && !decoded.executeGasLimit,
        )
        if (needsGasHotfix || (needsPaymasterGasFilled && hasSuccessfulGasEstimation)) {
            decoded.gasLimit = BigInt(result.gas) * 10n // TODO: contract simulation gas estimation errors
            decoded.executeGasLimit = BigInt(result.executeGas) * 10n
        }
        const args = [encodeHappyTx(decoded)]

        return {
            // restore original account, instead of zeroAddress which was used
            request: {
                ...request,
                args, // potentially updated gas values
                account: parseAccount(account),
            } as unknown as typeof request,
            result,
            simulation,
        }
    } catch (_err) {
        await submitterService.insertSimulationFailure(happyTxHash, req, _err)
        throw parseFromViemError(_err) || _err
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

type SubmitSimulateReturnType = SimulateContractReturnType<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    undefined,
    undefined,
    Account
> & { simulation?: SimulationResult | undefined }
