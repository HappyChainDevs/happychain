import { http, type Address, type Hex, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"
import { encodeFunctionData, keccak256, parseEther } from "viem/utils"
import type { z } from "zod"
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

        paymaster: zeroAddress, // paymaster is default
        executeGasLimit: 4000000000,
        gasLimit: 4000000000,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,

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

async function setPaymasterData(happyTx: HappyTx) {
    // self-paying
    if (happyTx.paymaster === happyTx.account) {
        return {
            executeGasLimit: happyTx.executeGasLimit,
            gasLimit: happyTx.gasLimit,
            maxFeePerGas: happyTx.maxFeePerGas,
            submitterFee: happyTx.submitterFee,
        }
    }

    // Using paymaster
    return { executeGasLimit: 0, gasLimit: 0, maxFeePerGas: 0n, submitterFee: 0n }
}

export async function prepareTx(happyTx: HappyTx) {
    const gasData = await setPaymasterData(happyTx)
    const validatorData = await getValidatorData({ ...happyTx, ...gasData })
    return convertHappyTxToExecuteInputTx({ ...happyTx, validatorData })
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
        maxFeePerGas: `0x${tx.maxFeePerGas.toString(16)}`,
        submitterFee: `0x${tx.submitterFee.toString(16)}`,
    }
    //
}
