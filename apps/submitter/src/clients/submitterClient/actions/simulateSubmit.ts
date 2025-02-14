import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Client, HttpTransport, SimulateContractParameters } from "viem"
import { parseAccount } from "viem/accounts"
import { simulateContract } from "viem/actions"
import { abis } from "#src/deployments"
import { parseFromViemError } from "#src/errors/utils"

export async function simulateSubmit<
    account extends Account | undefined = undefined,
    accountOverride extends Account = Account,
>(
    client: Client<HttpTransport, typeof happyChainSepolia, account>,
    request: Omit<
        SimulateContractParameters<
            typeof abis.HappyEntryPoint,
            "submit",
            readonly [`0x${string}`],
            typeof happyChainSepolia,
            undefined,
            accountOverride
        >,
        "abi" | "functionName"
    >,
) {
    const { account: account_ = client.account, ...params } = request
    if (!account_) throw new Error("Account Not Found - simulateSubmit")
    const account = parseAccount(account_)

    try {
        return await simulateContract(client, {
            ...params,
            account,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
        } as unknown as SimulateContractParameters)
    } catch (_err) {
        throw parseFromViemError(_err) || _err
    }
}
