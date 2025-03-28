import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, WriteContractParameters } from "viem"
import { parseAccount } from "viem/accounts"
import { walletClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import { parseFromViemError } from "#lib/errors/utils"
import { happyTransactionService, submitterService } from "#lib/services"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash.ts"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"

export async function submit(request: Omit<SubmitWriteParameters, "abi" | "functionName">): Promise<`0x${string}`> {
    const { account: account_, ...params } = request
    if (!account_) throw new Error("Account Not Found - submit")
    const account = account_ ? parseAccount(account_) : null

    try {
        const happyTxHash = computeHappyTxHash(decodeHappyTx(params.args[0]))
        const persisted = await happyTransactionService.findByHappyTxHashOrThrow(happyTxHash)
        const transactionHash = await walletClient.writeContract({
            ...params,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        } as WriteContractParameters)
        submitterService.finalizeWhenReady(decodeHappyTx(params.args[0]), persisted.id as number, transactionHash)
        return transactionHash
    } catch (_err) {
        throw parseFromViemError(_err) || _err
    }
}

type SubmitWriteParameters = WriteContractParameters<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    Account
>
