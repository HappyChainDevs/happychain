import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Client, HttpTransport, WriteContractParameters } from "viem"
import type { abis } from "#src/deployments"

export async function estimateSubmitGas<account extends Account | undefined = undefined>(
    client: Client<HttpTransport, typeof happyChainSepolia, account>,
    request: Omit<
        WriteContractParameters<
            typeof abis.HappyEntryPoint,
            "submit",
            [`0x${string}`],
            typeof happyChainSepolia,
            account
        >,
        "abi" | "functionName"
    >,
) {
    const { account: account_ = client.account, ..._params } = request

    if (!account_) throw new Error("Account Not Found - estimateGas")

    return {
        // TODO: need to estimate gas for tx, hardcoded values for now
        executeGasLimit: 4000000000n,
        gasLimit: 4000000000n,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,
    }
}
