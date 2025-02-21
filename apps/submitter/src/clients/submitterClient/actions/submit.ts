import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Client, HttpTransport, WriteContractParameters } from "viem"
import { parseAccount } from "viem/accounts"
import { writeContract } from "viem/actions"
import { abis } from "#src/deployments"
import { parseFromViemError } from "#src/errors/utils"

export async function submit<account extends Account | undefined = undefined>(
    client: Client<HttpTransport, typeof happyChainSepolia, account>,
    request: Omit<
        WriteContractParameters<
            typeof abis.HappyEntryPoint,
            "submit",
            readonly [`0x${string}`],
            typeof happyChainSepolia,
            account
        >,
        "abi" | "functionName"
    >,
) {
    const { account: account_ = client.account, ...params } = request
    if (!account_) throw new Error("Account Not Found - submit")
    const account = account_ ? parseAccount(account_) : null

    try {
        return await writeContract(client, {
            ...params,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        } as WriteContractParameters<
            typeof abis.HappyEntryPoint,
            "submit",
            readonly [`0x${string}`],
            typeof happyChainSepolia,
            account
        >)
    } catch (_err) {
        throw parseFromViemError(_err) || _err
    }
}
