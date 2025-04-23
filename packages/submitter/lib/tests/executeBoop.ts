import { abis, deployment } from "@happy.tech/contracts/boop/sepolia"
import { deployment as mockDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { computeBoopHash, createAccount, execute } from "@happy.tech/submitter-client"
import { http, createPublicClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { happychainTestnet } from "viem/chains"

const testAccount = privateKeyToAccount("0x8c5a8f60027c4a4654742cca624c7370599b0699dc142d44c9759e3040e201e3")

const publicClient = createPublicClient({
    chain: happychainTestnet,
    transport: http(),
})

async function getNonce(account: `0x${string}`, nonceTrack = 0n): Promise<bigint> {
    return await publicClient.readContract({
        address: deployment.EntryPoint,
        abi: abis.EntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

async function createAndSignMintTx(account: `0x${string}`) {
    const unsignedTx = {
        account,
        dest: mockDeployments.MockTokenA,
        nonceTrack: 0n,
        nonceValue: await getNonce(account),
        value: 0n,
        payer: zeroAddress,
        executeGasLimit: 0n,
        gasLimit: 0n,
        validatePaymentGasLimit: 4000000000n,
        validateGasLimit: 4000000000n,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,
        callData:
            "0x40c10f19000000000000000000000000d224f746ed779fd492ccadae5cd377e58ee811810000000000000000000000000000000000000000000000000de0b6b3a7640000" as `0x${string}`,
        validatorData: "0x" as `0x${string}`,
        extraData: "0x" as `0x${string}`,
    }

    const boopHash = computeBoopHash(216n, unsignedTx)
    const validatorData = await testAccount.signMessage({ message: { raw: boopHash } })
    return { ...unsignedTx, validatorData }
}

async function run() {
    const createAccountResult = await createAccount({
        owner: testAccount.address,
        salt: "0x01",
    })
    if (createAccountResult.isOk()) {
        const tx = await createAndSignMintTx(createAccountResult.value.address)
        const executeRes = await execute({
            tx,
        })
        if (executeRes.isOk()) {
            console.log("txHash", executeRes.value)
        } else {
            throw new Error(executeRes.error.message)
        }
    }
}

run().then(() => {
    console.log("done")
})
