import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/anvil"
import type { Address, PrivateKeyAccount, PublicClient, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
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
// generated using 'generatePrivateKey()' hardcoded here to skip re-deploying accounts for every test.
export const testAccount: PrivateKeyAccount = privateKeyToAccount(
    "0x513b9958a89be74b445362465c39ba0710d0e04aae3f0a8086e8ea064cdcea16",
)

export const testPublicClient: PublicClient<typeof config.transport, typeof config.chain> = //
    createPublicClient({ ...config, batch: { multicall: true } })
export const testWalletClient: WalletClient<typeof config.transport, typeof config.chain, typeof testAccount> =
    createWalletClient({ ...config, account: testAccount })

export async function fundAccount(address: Address) {
    const hash = await createWalletClient({
        chain,
        transport: http(),
        account: findExecutionAccount(),
    }).sendTransaction({ to: address, value: parseEther("1") })

    await testPublicClient.waitForTransactionReceipt({ hash })
}

/**
 * Fetches the nonce using the configured deploy entryPoint
 */
export async function getNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    return await testPublicClient.readContract({
        address: env.DEPLOYMENT_ENTRYPOINT,
        abi: abis.HappyEntryPoint,
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

export async function signTx(happyTx: HappyTx): Promise<HappyTx> {
    const happyTxHash = computeHappyTxHash(happyTx)
    const validatorData = await testAccount.signMessage({ message: { raw: happyTxHash } })
    return { ...happyTx, validatorData }
}
