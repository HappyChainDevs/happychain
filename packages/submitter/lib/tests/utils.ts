import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/anvil"
import type { Address, PrivateKeyAccount, PublicClient } from "viem"
import { http, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { localhost } from "viem/chains"
import { encodeFunctionData, parseEther } from "viem/utils"
import type { z } from "zod"
import { abis } from "#lib/deployments"
import env from "#lib/env"
import type { inputSchema as ExecuteInputSchema } from "#lib/routes/api/submitter/openApi/execute"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"

export { mockAbis, mockDeployments }

export type TestExecuteInput = z.input<typeof ExecuteInputSchema>

const chain = localhost

const config = { chain, transport: http() } as const

export const testPublicClient: PublicClient<typeof config.transport, typeof config.chain> = //
    createPublicClient({ ...config, batch: { multicall: true } })

export async function fundAccount(address: Address) {
    const hash = await createWalletClient({
        chain,
        transport: http(),
        account: findExecutionAccount(/* Default Execution Account */),
    }).sendTransaction({ to: address, value: parseEther("1") })

    await testPublicClient.waitForTransactionReceipt({ hash })
}

/**
 * Fetches the nonce using the configured deploy entryPoint
 */
export async function getNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    return await testPublicClient.readContract({
        address: env.DEPLOYMENT_ENTRYPOINT,
        abi: abis.EntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

export async function getMockTokenABalance(account: Address) {
    return await testPublicClient.readContract({
        address: mockDeployments.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "balanceOf",
        args: [account],
    })
}

export function createMockTokenAMintHappyTx(
    account: Address,
    nonceValue: bigint,
    nonceTrack = 0n,
    amount = 10n ** 18n,
): HappyTx {
    return {
        account,
        dest: mockDeployments.MockTokenA,
        nonceTrack: nonceTrack, // using as default
        nonceValue: nonceValue,
        value: 0n,

        // paymaster is default
        paymaster: zeroAddress,
        executeGasLimit: 0n,
        gasLimit: 0n,
        validatePaymentGasLimit: 4000000000n,
        validateGasLimit: 4000000000n,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,

        callData: encodeFunctionData({
            abi: mockAbis.MockTokenA,
            functionName: "mint",
            args: [account, amount],
        }),
        paymasterData: "0x",
        validatorData: "0x",
        extraData: "0x",
    }
}

export async function signTx(account: PrivateKeyAccount, happyTx: HappyTx): Promise<HappyTx> {
    const happyTxHash = computeHappyTxHash(happyTx)
    const validatorData = await account.signMessage({ message: { raw: happyTxHash } })
    return { ...happyTx, validatorData }
}
