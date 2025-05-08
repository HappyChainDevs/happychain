import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/anvil"
import type { Address, PrivateKeyAccount } from "viem"
import { zeroAddress } from "viem"
import { encodeFunctionData, parseEther } from "viem/utils"
import type { z } from "zod"
import { abis, deployment, env } from "#lib/env"
import { computeBoopHash } from "#lib/services/computeBoopHash"
import { findExecutionAccount } from "#lib/services/evmAccounts"
import type { Boop } from "#lib/types"
import { publicClient, walletClient } from "#lib/utils/clients"
import type { inputSchema as ExecuteInputSchema } from "#lib/utils/validation/boop"

export { mockDeployments, mockAbis }
export { client, createSmartAccount } from "./client"

export type TestExecuteInput = z.input<typeof ExecuteInputSchema>

export async function fundAccount(address: Address) {
    const executor = findExecutionAccount(/* Default Execution Account */)
    const hash = await walletClient.sendTransaction({ account: executor, to: address, value: parseEther("1") })
    await publicClient.waitForTransactionReceipt({ hash })
}

/**
 * Fetches the nonce using the configured deploy entryPoint
 */
export async function getNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    return await publicClient.readContract({
        address: deployment.EntryPoint,
        abi: abis.EntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

export async function getMockTokenABalance(account: Address) {
    return await publicClient.readContract({
        address: mockDeployments.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "balanceOf",
        args: [account],
    })
}

export type CreateMockTokenMintInput = {
    account: Address
    nonceValue: bigint
    nonceTrack?: bigint
    amount?: bigint
    gasLimits?: {
        total: number
        execute: number
        validate: number
        validatePayment: number
    }
}

const defaultGasLimits = {
    total: 1_000_000,
    execute: 100_000,
    validate: 100_000,
    validatePayment: 100_000,
}

export function createMockTokenMint({
    account,
    nonceValue = 0n,
    nonceTrack = 0n,
    amount = 10n ** 18n,
    gasLimits = defaultGasLimits,
}: CreateMockTokenMintInput): Boop {
    const boop = createMockTokenAMintBoop(account, nonceValue, nonceTrack, amount)
    boop.gasLimit = gasLimits.total
    boop.executeGasLimit = gasLimits.execute
    boop.validateGasLimit = gasLimits.validate
    boop.validatePaymentGasLimit = gasLimits.validatePayment
    return boop
}

export function createMockTokenAMintBoop(
    account: Address,
    nonceValue: bigint,
    nonceTrack = 0n,
    amount = 10n ** 18n,
): Boop {
    return {
        account,
        dest: mockDeployments.MockTokenA,
        nonceTrack: nonceTrack, // using as default
        nonceValue: nonceValue,
        value: 0n,

        // payer is default
        payer: zeroAddress,
        gasLimit: 0,
        validateGasLimit: 0,
        validatePaymentGasLimit: 0,
        executeGasLimit: 0, // 25_000_000,
        maxFeePerGas: 1_200_000_000n, // 1_000_000_007n,
        submitterFee: 0n,

        callData: encodeFunctionData({
            abi: mockAbis.MockTokenA,
            functionName: "mint",
            args: [account, amount],
        }),
        validatorData: "0x",
        extraData: "0x",
    }
}

export async function signTx(account: PrivateKeyAccount, boop: Boop): Promise<Boop> {
    const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), boop)
    const validatorData = await account.signMessage({ message: { raw: boopHash } })
    return { ...boop, validatorData }
}
