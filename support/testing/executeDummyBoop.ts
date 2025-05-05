/**
 * This script is intended to be run as part of a cron job to test boop's on testnet.
 * It creates a new account, prepares a boop that mints a token, and calls execute on the Entrypoint.
 */

import { abis, deployment } from "@happy.tech/contracts/boop/sepolia"
import { BoopClient, computeBoopHash } from "@happy.tech/boop-sdk"
import { deployment as mockDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { http, createPublicClient, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { happychainTestnet } from "viem/chains"

const pk = generatePrivateKey()
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
            "0x40c10f19000000000000000000000000d224f746ed779fd492ccadae5cd377e58ee811810000000000000000000000000000000000000000000000000de0b6b3a7640000" as `0x${string}`, // mint 1 token to 0xd224f746ed779fd492ccadae5cd377e58ee81181
        validatorData: "0x" as `0x${string}`,
        extraData: "0x" as `0x${string}`,
    }

    const boopHash = computeBoopHash(216n, unsignedTx)
    const validatorData = await testAccount.signMessage({ message: { raw: boopHash } })
    return { ...unsignedTx, validatorData }
}

async function run() {
    const boopClient = new BoopClient()
    const createAccountResult = await boopClient.createAccount({
        owner: testAccount.address,
        salt: "0x01",
    })

    if (!createAccountResult.isOk()) {
        throw new Error(createAccountResult.error.message)
    }

    const tx = await createAndSignMintTx(createAccountResult.value.address)
    const executeRes = await boopClient.execute({ tx })

    if (!executeRes.isOk()) {
        throw new Error(executeRes.error.message)
    }
    if (executeRes.value.status !== "submitSuccess") {
        throw new Error("submit failed")
    }
    console.log(`https://explorer.testnet.happy.tech/tx/${executeRes.value.state.receipt.txReceipt.transactionHash}`)
}

run().then(() => {
    console.log("done")
})
