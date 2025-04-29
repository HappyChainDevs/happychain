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
        executeGasLimit: 0,
        gasLimit: 0,
        validatePaymentGasLimit: 4000000000,
        validateGasLimit: 4000000000,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,

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
