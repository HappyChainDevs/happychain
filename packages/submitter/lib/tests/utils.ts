import type { Address, PublicClient, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"
import { encodeFunctionData, parseEther } from "viem/utils"
import type { z } from "zod"
import { abis, deployment } from "#lib/deployments"
import type { inputSchema as ExecuteInputSchema } from "#lib/routes/api/submitter/openApi/execute"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash.ts"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"

export type TestExecuteInput = z.input<typeof ExecuteInputSchema>

const chain = localhost

const config = { chain, transport: http() } as const
// generated using 'generatePrivateKey()' hardcoded here to skip re-deploying accounts for every test.
export const testAccount = createTestAccount("0x513b9958a89be74b445362465c39ba0710d0e04aae3f0a8086e8ea064cdcea16")

export const testPublicClient: PublicClient<typeof config.transport, typeof config.chain> = //
    createPublicClient({ ...config, batch: { multicall: true } })
export const testWalletClient: WalletClient<typeof config.transport, typeof config.chain, typeof testAccount.account> =
    createWalletClient({ ...config, account: testAccount.account })

export async function fundAccount(address: Address) {
    const hash = await createWalletClient({
        chain,
        transport: http(),
        account: findExecutionAccount(),
    }).sendTransaction({ to: address, value: parseEther("1") })

    await testPublicClient.waitForTransactionReceipt({ hash })
}

export function createTestAccount(privateKey = generatePrivateKey()) {
    const account = privateKeyToAccount(privateKey)
    const nonceMap = new Map()
    return {
        account,
        createHappyTx(nonceTrack = 0n) {
            const nonceValue = nonceMap.get(nonceTrack) ?? 0n
            const tx = createMockTokenAMintHappyTx(account.address, nonceValue)
            nonceMap.set(nonceTrack, nonceValue + 1n)
            tx.nonceTrack = nonceTrack
            return tx
        },
    }
}

export async function getNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    return await testPublicClient.readContract({
        address: account,
        abi: abis.ScrappyAccount,
        functionName: "nonceValue",
        args: [nonceTrack],
    })
}

export async function getMockTokenABalance(account: Address) {
    return await testPublicClient.readContract({
        address: deployment.MockTokenA,
        abi: abis.MockTokenA,
        functionName: "balanceOf",
        args: [account],
    })
}

export function createMockTokenAMintHappyTx(account: Address, nonceValue: bigint, nonceTrack = 0n): HappyTx {
    return {
        account,
        dest: deployment.MockTokenA,
        nonceTrack: nonceTrack, // using as default
        nonceValue: nonceValue,
        value: 0n,

        // paymaster is default
        paymaster: zeroAddress,
        executeGasLimit: 0n, // TODO: contract error, this breaks if set to zero
        gasLimit: 0n,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,

        callData: encodeFunctionData({
            abi: abis.MockTokenA,
            functionName: "mint",
            args: [account, 10n ** 18n],
        }),
        paymasterData: "0x",
        validatorData: "0x",
        extraData: "0x",
    }
}

export async function signTx(happyTx: HappyTx): Promise<HappyTx> {
    const happyTxHash = computeHappyTxHash(happyTx)
    const validatorData = await testAccount.account.signMessage({ message: { raw: happyTxHash } })
    return { ...happyTx, validatorData }
}
