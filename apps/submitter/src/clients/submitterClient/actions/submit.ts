import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, WriteContractParameters } from "viem"
import { parseAccount } from "viem/accounts"
import { walletClient } from "#src/clients"
import { abis } from "#src/deployments"
import { parseFromViemError } from "#src/errors/utils"

export async function submit(request: Omit<SubmitWriteParameters, "abi" | "functionName">): Promise<`0x${string}`> {
    const { account: account_, ...params } = request
    if (!account_) throw new Error("Account Not Found - submit")
    const account = account_ ? parseAccount(account_) : null

    try {
        return await walletClient.writeContract({
            ...params,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        } as WriteContractParameters)
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
