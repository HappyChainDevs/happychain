import { http, type Hex, concat, createPublicClient } from "viem"
import type { SmartAccount, UserOperation } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"

import type { SmartAccountClient } from "permissionless"
import type { Erc7579Actions } from "permissionless/actions/erc7579"

import { deployment } from "../deployments/anvil/aa/abis"
import { deployment as mockDeployment } from "../deployments/anvil/mocks/abis.ts"
import {
    AMOUNT,
    createMintCall,
    depositPaymaster,
    fundSmartAccount,
    getFormattedTokenBalance,
    getRandomAddress,
} from "./utils/accounts"
import { account, publicClient } from "./utils/clients"
import { rpcURL } from "./utils/config"
import { getKernelAccount, getKernelClient } from "./utils/kernel"
import { installCustomModule, uninstallCustomModule } from "./utils/moduleHelpers"
import { getCustomNonce } from "./utils/nonce"

const sessionKey = generatePrivateKey()
const sessionAccount = privateKeyToAccount(sessionKey)
const sessionPublicClient = createPublicClient({
    chain: localhost,
    transport: http(rpcURL),
})

// An empty hex string to be used when signing over a userOperation.
const EMPTY_SIGNATURE = "0x"

async function testRootValidator(kernelClient: SmartAccountClient) {
    const receiverAddress = getRandomAddress()

    const txHash = await kernelClient.sendTransaction({
        ...createMintCall(receiverAddress),
        account: kernelClient.account!,
        chain: localhost,
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    if (receipt.status !== "success") {
        throw new Error("KernelClient transaction failed")
    }

    const balance = await getFormattedTokenBalance(receiverAddress)
    if (balance === AMOUNT) {
        console.log(`Using RootValidator: Balance is correct: ${balance} ETH`)
    } else {
        throw new Error(`Using RootValidator: Balance is not correct: ${balance} ETH`)
    }
}

async function testCustomValidator(kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>) {
    const sessionSigner = await getKernelAccount(sessionPublicClient, sessionAccount)
    const customNonce = await getCustomNonce(
        kernelClient.account!.client,
        kernelClient.account!.address,
        deployment.SessionKeyValidator,
    )
    // construct onInstallData: first 20 bytes: sessionKey, second 20 bytes: targetContract
    const targetContract: Hex = mockDeployment.MockTokenA
    const onInstallData = concat([sessionAccount.address, targetContract])
    await installCustomModule(kernelClient, onInstallData)

    const mintReceiverAddress = getRandomAddress()
    const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
        account: kernelClient.account!,
        calls: [createMintCall(mintReceiverAddress)],
        nonce: customNonce,
    })

    userOp.signature = await sessionSigner.signUserOperation({
        ...userOp,
        chainId: localhost.id,
        signature: EMPTY_SIGNATURE, // The signature field must be empty when hashing and signing the user operation.
    })

    const userOpHash = await kernelClient.sendUserOperation({
        ...userOp,
    })

    const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
    })

    if (!receipt.success) {
        throw new Error("Validation using custom validator module failed")
    }

    const balance = await getFormattedTokenBalance(mintReceiverAddress)
    if (balance === AMOUNT) {
        console.log(`Using CustomValidator: Balance is correct: ${balance} ETH`)
    } else {
        throw new Error(`Using CustomValidator: Balance is not correct: ${balance} ETH`)
    }

    await uninstallCustomModule(kernelClient)
}

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount(publicClient, account)
    const kernelClient = getKernelClient(kernelAccount)

    if ((await fundSmartAccount(kernelAccount.address)) === "reverted") {
        throw new Error("Funding SmartAccount failed")
    }

    if ((await depositPaymaster()) === "reverted") {
        throw new Error("Paymaster Deposit failed")
    }

    try {
        await testRootValidator(kernelClient)
    } catch (error) {
        console.error("Root Validator: ", error)
    }

    try {
        await testCustomValidator(kernelClient)
    } catch (error) {
        console.error("Custom Validator: ", error)
    }
}

main().then(() => {
    process.exit(0)
})
