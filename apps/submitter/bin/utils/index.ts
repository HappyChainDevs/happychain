import { computeBoopHash } from "@happy.tech/boop-sdk"
import type { Address } from "@happy.tech/common"
import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { type PrivateKeyAccount, parseEther, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { encodeFunctionData } from "viem/utils"
import type { Boop } from "#lib/types"

export const testAccount: PrivateKeyAccount = privateKeyToAccount(generatePrivateKey())

export async function createAndSignMintTx(account: Address, nonceValue: bigint) {
    const unsignedTx = {
        account,
        dest: mockDeployments.MockTokenA,
        nonceTrack: 0n,
        nonceValue,
        value: 0n,
        payer: zeroAddress,
        gasLimit: 0,
        validateGasLimit: 0,
        validatePaymentGasLimit: 0,
        executeGasLimit: 0,
        maxFeePerGas: 0n,
        submitterFee: 0n,
        callData: encodeFunctionData({
            abi: mockAbis.MockTokenA,
            functionName: "mint",
            args: [account, parseEther("1")],
        }),
        validatorData: "0x",
        extraData: "0x",
    } satisfies Boop

    const boopHash = computeBoopHash(BigInt(process.env.CHAIN_ID!), unsignedTx)
    const validatorData = await testAccount.signMessage({ message: { raw: boopHash } })
    return { ...unsignedTx, validatorData }
}
