import { http, type Address, type Hex, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"
import { encodeFunctionData, keccak256, parseEther } from "viem/utils"
import { abis, deployment } from "#src/deployments"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"

// generated using 'generatePrivateKey()' but hardcoded here to skip re-deploying accounts for every test.
// const key = generatePrivateKey() for full tests
const key = "0x513b9958a89be74b445362465c39ba0710d0e04aae3f0a8086e8ea064cdcea16"
const config = { chain: localhost, transport: http() }
export const testAccount = privateKeyToAccount(key)
export const testPublicClient = createPublicClient({ ...config, batch: { multicall: true } })
export const testWalletClient = createWalletClient({ ...config, account: testAccount })

export async function createMockTokenAMintTx(account: Address): Promise<HappyTx> {
    return {
        account,
        dest: deployment.MockTokenA,
        nonceTrack: 0n, // using as default
        nonceValue: await testPublicClient.readContract({
            address: account,
            abi: abis.ScrappyAccount,
            functionName: "getNonce",
            args: [0n],
        }),
        value: 0n,

        paymaster: zeroAddress, // paymaster is default
        executeGasLimit: 4000000000,
        gasLimit: 4000000000,
        maxFeePerGas: ((await testPublicClient.estimateMaxPriorityFeePerGas()) * 120n) / 100n,
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
    return encodeHappyTx({ ...happyTx, validatorData })
}

async function getValidatorData(happyTx: HappyTx): Promise<Hex> {
    const happyTxHash = keccak256(encodeHappyTx(happyTx))
    return await testAccount.signMessage({ message: { raw: happyTxHash } })
}
