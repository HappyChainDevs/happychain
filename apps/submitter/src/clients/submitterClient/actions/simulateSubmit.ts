import type { happyChainSepolia } from "@happy.tech/wallet-common"
import { type Account, type SimulateContractParameters, type SimulateContractReturnType, zeroAddress } from "viem"
import { parseAccount } from "viem/accounts"
import { publicClient } from "#src/clients"
import { abis } from "#src/deployments"
import { parseFromViemError } from "#src/errors/utils"
import { decodeHappyTx } from "#src/utils/decodeHappyTx"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"

export async function simulateSubmit(
    request: Omit<SubmitSimulateParameters, "abi" | "functionName">,
): Promise<SubmitSimulateReturnType> {
    if (!request.account) throw new Error("Account Not Found - simulateSubmit")

    // Simulate with zero address to allow for future nonce simulation
    const account = parseAccount(zeroAddress)
    const requestAccount = parseAccount(request.account)

    const req = {
        ...request,
        account,
        abi: abis.HappyEntryPoint,
        functionName: "submit",
    } as SubmitSimulateParameters

    const tx = decodeHappyTx(req.args[0])
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
            request: {
                ...request,
                // potentially updated gas values
                args,
                // restore original account, instead of zeroAddress which was used
                account: requestAccount,
            } as unknown as typeof request,
            result,
        }
    } catch (_err) {
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
>
