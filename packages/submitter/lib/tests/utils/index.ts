import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/anvil"
import type { Address, PrivateKeyAccount } from "viem"
import { zeroAddress } from "viem"
import { encodeFunctionData, parseEther } from "viem/utils"
import type { z } from "zod"
import { publicClient, walletClient } from "#lib/clients/index.ts"
import { abis } from "#lib/deployments"
import env from "#lib/env"
import type { inputSchema as ExecuteInputSchema } from "#lib/routes/api/submitter/openApi/execute"
import type { Boop } from "#lib/tmp/interface/Boop"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"

export { mockDeployments, mockAbis }

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
        address: env.DEPLOYMENT_ENTRYPOINT,
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

export function createMockTokenAMintHappyTx(
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
        validatorData: "0x",
        extraData: "0x",
    }
}

export async function signTx(account: PrivateKeyAccount, happyTx: Boop): Promise<Boop> {
    const boopHash = computeBoopHash(happyTx)
    const validatorData = await account.signMessage({ message: { raw: boopHash } })
    return { ...happyTx, validatorData }
}
