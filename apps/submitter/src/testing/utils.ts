import { http, type Address, type Hex, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"
import { encodeFunctionData, keccak256, parseEther } from "viem/utils"
import type { z } from "zod"
import { findExecutionAccount } from "#src/actions/findExecutionAccount"
import { abis, deployment } from "#src/deployments"
import type { ExecuteInputSchema } from "#src/routes/api/submitter_execute/ExecuteInputSchema"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"

export type TestExecuteInput = z.input<typeof ExecuteInputSchema>

const config = { chain: localhost, transport: http() }
// generated using 'generatePrivateKey()' hardcoded here to skip re-deploying accounts for every test.
export const testAccount = createTestAccount("0x513b9958a89be74b445362465c39ba0710d0e04aae3f0a8086e8ea064cdcea16")
export const testPublicClient = createPublicClient({ ...config, batch: { multicall: true } })
export const testWalletClient = createWalletClient({ ...config, account: testAccount.account })

export async function fundAccount(address: Address) {
    const hash = await createWalletClient({
        chain: localhost,
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
            return tx
        },
    }
}

export async function getNonce(account: Address) {
    return await testPublicClient.readContract({
        address: account,
        abi: abis.ScrappyAccount,
        functionName: "getNonce",
        args: [0n],
    })
}

export function createMockTokenAMintHappyTx(account: Address, nonceValue: bigint): HappyTx {
    return {
        account,
        dest: deployment.MockTokenA,
        nonceTrack: 0n, // using as default
        nonceValue: nonceValue,
        value: 0n,

        // paymaster is default
        paymaster: zeroAddress,
        executeGasLimit: 0n,
        gasLimit: 0n,
        maxFeePerGas: 0n,
        submitterFee: 0n,

        callData: encodeFunctionData({
            abi: abis.MockTokenA,
            functionName: "mint",
            args: [account, parseEther("0.001")],
        }),
        paymasterData: "0x",
        validatorData: "0x",
        extraData: "0x",
    }
}

async function getDefaultGasData(happyTx: HappyTx) {
    if (happyTx.paymaster === happyTx.account) {
        return {
            // self-paying can't have empty gas values
            executeGasLimit: happyTx.executeGasLimit || 4000000000n,
            gasLimit: happyTx.gasLimit || 4000000000n,
            maxFeePerGas: happyTx.maxFeePerGas || 1200000000n,
            submitterFee: happyTx.submitterFee || 100n,
        }
    }

    // Using paymaster
    return { executeGasLimit: 0n, gasLimit: 0n, maxFeePerGas: 0n, submitterFee: 0n }
}

export async function prepareTx(happyTx: HappyTx) {
    const gasData = await getDefaultGasData(happyTx)
    const validatorData = await getValidatorData({ ...happyTx, ...gasData })
    return convertHappyTxToExecuteInputTx({ ...happyTx, ...gasData, validatorData })
    // return encodeHappyTx({ ...happyTx, validatorData })
}

async function getValidatorData(happyTx: HappyTx): Promise<Hex> {
    const happyTxHash = keccak256(encodeHappyTx(happyTx))
    return await testAccount.account.signMessage({ message: { raw: happyTxHash } })
}

function convertHappyTxToExecuteInputTx(tx: HappyTx): TestExecuteInput["tx"] {
    // uncomment to return encoded tx
    // return encodeHappyTx({ ...happyTx, validatorData })
    return {
        ...tx,
        value: `0x${tx.value.toString(16)}`,
        nonceTrack: `0x${tx.nonceTrack.toString(16)}`,
        nonceValue: `0x${tx.nonceValue.toString(16)}`,
        gasLimit: `0x${tx.gasLimit.toString(16)}`,
        executeGasLimit: `0x${tx.executeGasLimit.toString(16)}`,
        maxFeePerGas: `0x${tx.maxFeePerGas.toString(16)}`,
        submitterFee: `0x${tx.submitterFee.toString(16)}`,
    }
    //
}
