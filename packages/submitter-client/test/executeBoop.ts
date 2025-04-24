import { abis, deployment } from "@happy.tech/contracts/boop/sepolia"
import { deployment as mockDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { http, createPublicClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { happychainTestnet } from "viem/chains"
import { computeBoopHash, createAccount, execute } from "../lib/index"

const pk = process.env.SUBMITTER_CRON_PK

if (!pk) {
    throw new Error("SUBMITTER_CRON_PK is not set – did you add the secret to the workflow?")
}

const testAccount = privateKeyToAccount(pk as `0x${string}`)

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
            "0x40c10f19000000000000000000000000d224f746ed779fd492ccadae5cd377e58ee811810000000000000000000000000000000000000000000000000de0b6b3a7640000" as `0x${string}`, // mint some number of tokens to 0xd224f746ed779fd492ccadae5cd377e58ee81181
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

    if (!createAccountResult.isOk()) {
        throw new Error(createAccountResult.error.message)
    }

    const tx = await createAndSignMintTx(createAccountResult.value.address)
    const executeRes = await execute({ tx })

    if (!executeRes.isOk()) {
        throw new Error(executeRes.error.message)
    }

    console.log("tx status", executeRes.value.status)
}

run().then(() => {
    console.log("done")
})
