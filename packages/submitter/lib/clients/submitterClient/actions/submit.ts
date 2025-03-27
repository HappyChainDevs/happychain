import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, WriteContractParameters } from "viem"
import { parseAccount } from "viem/accounts"
import { walletClient } from "#lib/clients"
import { abis } from "#lib/deployments"
import { UnknownError } from "#lib/errors"
import { parseFromViemError } from "#lib/errors/utils"
import { submitterService } from "#lib/services"
import { decodeHappyTx } from "#lib/utils/decodeHappyTx"
import { AccountNotFoundError } from "../errors"

export async function submit(request: Omit<SubmitWriteParameters, "abi" | "functionName">): Promise<`0x${string}`> {
    const { account: account_, ...params } = request
    if (!account_) throw new AccountNotFoundError("submit")
    const account = account_ ? parseAccount(account_) : null

    try {
        const transactionHash = await walletClient.writeContract({
            ...params,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        } as WriteContractParameters)

        submitterService.finalizeWhenReady(decodeHappyTx(params.args[0]), transactionHash)

        return transactionHash
    } catch (_err) {
        throw parseFromViemError(_err) || new UnknownError(_err?.message || "Failed to simulate contract")
    }
}

type SubmitWriteParameters = WriteContractParameters<
    typeof abis.HappyEntryPoint,
    "submit",
    readonly [`0x${string}`],
    typeof happyChainSepolia,
    Account
>
