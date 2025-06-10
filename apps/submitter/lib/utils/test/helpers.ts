import { expect } from "bun:test"
import type { Address } from "@happy.tech/common"
import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/anvil"
import type { PrivateKeyAccount } from "viem"
import { decodeEventLog, zeroAddress } from "viem"
import { encodeFunctionData, parseEther } from "viem/utils"
import { abis, deployment, env } from "#lib/env"
import { findExecutionAccount } from "#lib/services/evmAccounts" // no barrel: don't start services
import type { Boop, BoopReceipt } from "#lib/types"
import { computeBoopHash } from "#lib/utils/boop"
import { publicClient, walletClient } from "#lib/utils/clients"

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

export async function getMockTokenBalance(account: Address) {
    return await publicClient.readContract({
        address: mockDeployments.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "balanceOf",
        args: [account],
    })
}

export const zeroGasLimits = {
    gasLimit: 0,
    executeGasLimit: 0,
    validateGasLimit: 0,
    validatePaymentGasLimit: 0,
}

export const nonZeroGasLimits = {
    gasLimit: 1_000_000,
    executeGasLimit: 100_000,
    validateGasLimit: 100_000,
    validatePaymentGasLimit: 100_000,
}

export type CreateMintBoopInput = {
    account: Address
    nonceValue: bigint
    nonceTrack?: bigint
    amount?: bigint
    gasLimits?: typeof zeroGasLimits
}

export function createMintBoop({
    account,
    nonceValue,
    nonceTrack = 0n,
    amount = 10n ** 18n,
    gasLimits = zeroGasLimits,
}: CreateMintBoopInput): Boop {
    return {
        account,
        dest: mockDeployments.MockTokenA,
        nonceTrack: nonceTrack,
        nonceValue: nonceValue,
        value: 0n,

        // payer is default
        payer: zeroAddress,
        ...gasLimits,
        maxFeePerGas: 0n,
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

export async function signBoop(account: PrivateKeyAccount, boop: Boop): Promise<Boop> {
    const boopHash = computeBoopHash(env.CHAIN_ID, boop)
    const validatorData = await account.signMessage({ message: { raw: boopHash } })
    return { ...boop, validatorData }
}

export async function createAndSignMintBoop(account: PrivateKeyAccount, input: CreateMintBoopInput): Promise<Boop> {
    const boop = createMintBoop(input)
    return signBoop(account, boop)
}

export function assertMintLog(receipt: BoopReceipt, smartAccount: Address) {
    expect(receipt.logs.length).toBe(1)
    const log = receipt.logs[0]
    const topics: `0x${string}`[] = log.topics
    const eventTopics: [] | [signature: `0x${string}`, ...args: `0x${string}`[]] =
        topics.length === 0
            ? []
            : ([topics[0], ...topics.slice(1)] as [signature: `0x${string}`, ...args: `0x${string}`[]])

    const { eventName, args } = decodeEventLog({
        abi: mockAbis.MockTokenA,
        eventName: "Transfer",
        data: log.data,
        topics: eventTopics,
    })

    expect(eventName).toBe("Transfer")
    expect(args.from).toBe(zeroAddress)
    expect(args.to.toLowerCase()).toBe(smartAccount.toLowerCase())
    expect(receipt.logs[0].address).toBe(mockDeployments.MockTokenA.toLowerCase() as Address)
}

/**
 * Fund the given account with 1 Ether.
 * Exported from the index to avoid pulling business logic into helpers.ts, so that we can use it for scripts, etc.
 */
export async function fundAccount(address: Address) {
    const executor = findExecutionAccount(/* Default Execution Account */)
    const hash = await walletClient.sendTransaction({ account: executor, to: address, value: parseEther("1") })
    await publicClient.waitForTransactionReceipt({ hash })
}
