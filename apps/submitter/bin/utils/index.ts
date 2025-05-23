import { computeBoopHash } from "@happy.tech/boop-sdk"
import { abis, deployment } from "@happy.tech/contracts/boop/sepolia"
import { deployment as mockDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { http, type PrivateKeyAccount, createPublicClient, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { happychainTestnet } from "viem/chains"

const pk = generatePrivateKey()
export const testAccount: PrivateKeyAccount = privateKeyToAccount(pk as `0x${string}`)

const publicClient = createPublicClient({
    chain: happychainTestnet,
    transport: http(),
})

export async function getNonce(account: `0x${string}`, nonceTrack = 0n): Promise<bigint> {
    return await publicClient.readContract({
        address: deployment.EntryPoint,
        abi: abis.EntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

export async function createAndSignMintTx(account: `0x${string}`, nonceValue: bigint) {
    const unsignedTx = {
        account,
        dest: mockDeployments.MockTokenA,
        nonceTrack: 0n,
        nonceValue,
        value: 0n,
        payer: zeroAddress,
        executeGasLimit: 0n,
        gasLimit: 0n,
        validatePaymentGasLimit: 4000000000n,
        validateGasLimit: 4000000000n,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,
        callData:
            "0x40c10f19000000000000000000000000d224f746ed779fd492ccadae5cd377e58ee811810000000000000000000000000000000000000000000000000de0b6b3a7640000" as `0x${string}`, // mint 1 token to 0xd224f746ed779fd492ccadae5cd377e58ee81181
        validatorData: "0x" as `0x${string}`,
        extraData: "0x" as `0x${string}`,
    }

    const boopHash = computeBoopHash(216n, unsignedTx)
    const validatorData = await testAccount.signMessage({ message: { raw: boopHash } })
    return { ...unsignedTx, validatorData }
}
