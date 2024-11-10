import { encodeFunctionData, parseEther } from "viem"
import type { SmartAccount, UserOperation, UserOperationCall, UserOperationReceipt } from "viem/account-abstraction"
import { localhost } from "viem/chains"

import type { SmartAccountClient } from "permissionless"

import { abis as mockAbis, deployment as mockDeployment } from "../deployments/anvil/mockTokens/abis"
import { deployment } from "../deployments/anvil/testing/abis"

import { VALIDATOR_MODE, VALIDATOR_TYPE, getCustomNonce } from "./getNonce"

import { deposit_paymaster, get_random_address, initialize_total_supply } from "./utils/accounts"
import { account, pimlicoClient, publicClient, walletClient } from "./utils/clients"
import { generatePrefundedKernelAccount, generatePrefundedKernelAccounts } from "./utils/kernel"

interface Accounts {
    kernelAccount: SmartAccount
    kernelClient: SmartAccountClient
}

interface GasDetails {
    directTxGas: bigint
    bundlerTxGas: bigint
    totalUserOpGas: bigint
    totalOverhead: bigint
    bundlerOverhead: bigint
    userOpOverhead: bigint
}

interface GasResult extends GasDetails {
    scenario: string
    accountDeploymentOverhead: bigint
}

// A dummy constant representing the amount of ETH to transfer in the demo.
const AMOUNT = parseEther("0.01")
const EMPTY_SIGNATURE = "0x"

function createMintCall(address: Address): UserOperationCall {
    return {
        to: mockDeployment.MockTokenA,
        value: 0n,
        data: encodeFunctionData({
            abi: mockAbis.MockTokenA,
            functionName: "mint",
            args: [address, parseEther(AMOUNT)],
        }),
    }
}

function printPaymasterGasEstimates(preVerificationGas: bigint, verificationGasLimit: bigint, callGasLimit: bigint) {
    console.log("Estimated UserOperation Gas:")
    console.log(`  PreVerificationGas:   ${preVerificationGas.toLocaleString("en-US")} gas`)
    console.log(`  VerificationGasLimit: ${verificationGasLimit.toLocaleString("en-US")} gas`)
    console.log(`  CallGasLimit:         ${callGasLimit.toLocaleString("en-US")} gas`)
}

function printUserOperationGasDetails(gasDetails: GasDetails) {
    console.log("User Operation Gas Details (avg):")
    console.log(`  Direct Transaction Gas:     ${gasDetails.directTxGas.toLocaleString("en-US")} gas`)
    console.log(`  Bundler Transaction Gas:    ${gasDetails.bundlerTxGas.toLocaleString("en-US")} gas`)
    console.log(`  Total UserOp Gas:           ${gasDetails.totalUserOpGas.toLocaleString("en-US")} gas`)
    console.log(`  Bundler Overhead:           ${gasDetails.bundlerOverhead.toLocaleString("en-US")} gas`)
    console.log(`  UserOp Overhead:            ${gasDetails.userOpOverhead.toLocaleString("en-US")} gas`)
    console.log(`  Total Overhead:             ${gasDetails.totalOverhead.toLocaleString("en-US")} gas`)
}

async function sendUserOp(kernelAccount: SmartAccount, kernelClient: SmartAccountClient, calls: UserOperationCall[]) {
    const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
        account: kernelAccount,
        calls,
    })

    const paymasterGasEstimates = await pimlicoClient.estimateUserOperationGas({
        ...userOp,
    })

    const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: await kernelClient.sendUserOperation({
            account: kernelAccount,
            calls,
        }),
    })

    if (!receipt.success) {
        throw new Error(`UserOperation failed. Receipt: ${JSON.stringify(receipt.receipt)}`)
    }

    const numCalls = BigInt(calls.length)
    const directTxGas = (await sendDirectTransactions(numCalls)) / numCalls
    const bundlerTxGas = receipt.receipt.gasUsed / numCalls
    const totalUserOpGas = receipt.actualGasUsed / numCalls
    const totalOverhead = totalUserOpGas - directTxGas
    const bundlerOverhead = totalUserOpGas - bundlerTxGas
    const userOpOverhead = totalOverhead - bundlerOverhead

    const gasDetails: GasDetails = {
        directTxGas,
        bundlerTxGas,
        totalUserOpGas,
        totalOverhead,
        bundlerOverhead,
        userOpOverhead,
    }

    printPaymasterGasEstimates(
        paymasterGasEstimates.preVerificationGas,
        paymasterGasEstimates.verificationGasLimit,
        paymasterGasEstimates.callGasLimit,
    )

    printUserOperationGasDetails(gasDetails)
    return gasDetails
}

async function sendUserOps(accounts: Accounts[]) {
    // Prepare and sign all user operations upfront to send them concurrently.
    // This increases the chance they are included in the same bundle.
    const userOps: UserOperation<"0.7">[] = await Promise.all(
        accounts.map(async (account) => {
            const userOp: UserOperation<"0.7"> = await account.kernelClient.prepareUserOperation({
                account: account.kernelAccount,
                calls: [createMintCall(account.kernelAccount.address)],
            })

            userOp.signature = await account.kernelAccount.signUserOperation({
                ...userOp,
                chainId: localhost.id,
                signature: EMPTY_SIGNATURE, // The signature field must be empty when hashing and signing the user operation.
            })

            return userOp
        }),
    )

    const hashes = await Promise.all(
        accounts.map((account, idx) => account.kernelClient.sendUserOperation(userOps[idx])),
    )

    const receipts: UserOperationReceipt[] = await Promise.all(
        accounts.map((account, idx) =>
            account.kernelClient.waitForUserOperationReceipt({
                hash: hashes[idx],
            }),
        ),
    )

    receipts.forEach((receipt) => {
        if (!receipt.success) throw new Error(`UserOperation failed. Receipt: ${JSON.stringify(receipt.receipt)}`)
    })

    const transactionFrequency: { [key: string]: number } = receipts.reduce(
        (freq, r) => {
            const index = r.receipt.transactionIndex.toString()
            freq[index] = (freq[index] || 0) + 1
            return freq
        },
        {} as { [key: string]: number },
    )

    const dominantTransactionIndex = Number(
        Object.keys(transactionFrequency).reduce((a, b) => (transactionFrequency[a] > transactionFrequency[b] ? a : b)),
    )

    const filteredReceipts = receipts.filter((receipt) => receipt.receipt.transactionIndex === dominantTransactionIndex)

    const { numOps, gasDetails } = await calculateGasDetails(filteredReceipts)
    return { numOps, gasDetails }
}

async function calculateGasDetails(filteredReceipts: UserOperationReceipt[]) {
    const numOps = BigInt(filteredReceipts.length)
    const avgDirectTxGas = (await sendDirectTransactions(numOps)) / numOps
    const totalBundlerTxGas = filteredReceipts[0].receipt.gasUsed
    const avgBundlerTxGas = totalBundlerTxGas / numOps
    const totalBundlerOverhead = filteredReceipts.reduce(
        (acc, receipt) => acc + (receipt.actualGasUsed - avgBundlerTxGas),
        BigInt(0),
    )
    const avgBundlerOverhead = totalBundlerOverhead / numOps
    const avgTotalUserOpGas = avgBundlerOverhead + avgBundlerTxGas
    const avgTotalOverhead = avgTotalUserOpGas - avgDirectTxGas
    const avgUserOpOverhead = avgTotalOverhead - avgBundlerOverhead

    const gasDetails: GasDetails = {
        directTxGas: avgDirectTxGas,
        bundlerTxGas: avgBundlerTxGas,
        totalUserOpGas: avgTotalUserOpGas,
        totalOverhead: avgTotalOverhead,
        bundlerOverhead: avgBundlerOverhead,
        userOpOverhead: avgUserOpOverhead,
    }

    return { numOps, gasDetails }
}

async function sendDirectTransactions(count = 1n) {
    let totalGas = 0n

    for (let i = 0; i < count; i++) {
        const hash = await walletClient.sendTransaction({
            account,
            ...createMintCall(account.address),
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        totalGas += receipt.gasUsed
    }

    return totalGas
}

async function singleUserOperationGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    console.log("\nGas Usage for a Single UserOp (with Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails1 = await sendUserOp(kernelAccount, kernelClient, [createMintCall()])
    const singleOpWithDeploymentResults = {
        scenario: "Single UserOp with 1 call (with Deployment)",
        ...gasDetails1,
        accountDeploymentOverhead: 0n,
    }

    console.log("\nGas Usage for a Single UserOp (no Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails2 = await sendUserOp(kernelAccount, kernelClient, [createMintCall()])
    const singleOpNoDeploymentResults = {
        scenario: "Single UserOp with 1 call (no Deployment)",
        ...gasDetails2,
        accountDeploymentOverhead: 0n,
    }

    singleOpWithDeploymentResults.accountDeploymentOverhead =
        singleOpWithDeploymentResults.totalOverhead - singleOpNoDeploymentResults.totalOverhead
    return { singleOpWithDeploymentResults, singleOpNoDeploymentResults }
}

async function multipleCallsGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    const calls = Array(5)
        .fill(null)
        .map(() => createMintCall())

    console.log("\nGas Usage for a Single UserOp with 5 Calls (no Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails2 = await sendUserOp(kernelAccount, kernelClient, calls)
    return {
        scenario: "Single UserOp with 5 calls (no Deployment)",
        ...gasDetails2,
        accountDeploymentOverhead: 0n,
    }
}

async function batchedUserOpsSameSenderGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    const kernelAddress = await kernelAccount.getAddress()
    const nonces = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
            getCustomNonce(
                walletClient,
                kernelAddress,
                deployment.ECDSAValidator,
                BigInt(i),
                VALIDATOR_MODE.DEFAULT,
                VALIDATOR_TYPE.ROOT,
            ),
        ),
    )

    const hashes = await Promise.all(
        nonces.map((nonce) =>
            kernelClient.sendUserOperation({
                account: kernelAccount,
                calls: [createMintCall()],
                nonce: nonce,
            }),
        ),
    )

    const receipts = await Promise.all(hashes.map((hash) => kernelClient.waitForUserOperationReceipt({ hash })))
    receipts.forEach((receipt) => {
        if (!receipt.success) {
            throw new Error(`UserOperation failed. Receipt: ${JSON.stringify(receipt.receipt)}`)
        }
    })

    const { numOps, gasDetails } = await calculateGasDetails(receipts)
    console.log("\nGas Usage per UserOp (no Deployment) from the same Sender:")
    console.log(`(Processed ${numOps} UserOps in this bundle)`)
    console.log("---------------------------------------------------------------------\n")
    printUserOperationGasDetails(gasDetails)

    return {
        scenario: `Avg UserOp in a Bundle of ${numOps} UserOps (same sender)`,
        ...gasDetails,
        accountDeploymentOverhead: 0n,
    }
}

async function batchedUserOperationsGasResult() {
    const accounts = await generatePrefundedKernelAccounts(5)
    const { numOps: numOps1, gasDetails: gasDetails1 } = await sendUserOps(accounts)
    const { numOps: numOps2, gasDetails: gasDetails2 } = await sendUserOps(accounts)

    console.log("\nGas Usage per UserOp (with Deployment) from different Senders:")
    console.log(`(Processed ${numOps1} UserOps in this bundle, each from a different sender)`)
    console.log("---------------------------------------------------------------------\n")
    printUserOperationGasDetails(gasDetails1)

    console.log("\nGas Usage per UserOp (no Deployment) from different Senders:")
    console.log(`(Processed ${numOps2} UserOps in this bundle, each from a different sender)`)
    console.log("---------------------------------------------------------------------\n")
    printUserOperationGasDetails(gasDetails2)

    const multipleUserOpsWithDeploymentResults = {
        scenario: `Avg UserOp in a Bundle of ${numOps1} UserOps (with Deployment)`,
        ...gasDetails1,
        accountDeploymentOverhead: gasDetails1.totalOverhead - gasDetails2.totalOverhead,
    }

    const multipleUserOpsNoDeploymentResults = {
        scenario: `Avg UserOp in a Bundle of ${numOps2} UserOps (no Deployment)`,
        ...gasDetails2,
        accountDeploymentOverhead: 0n,
    }

    return { multipleUserOpsWithDeploymentResults, multipleUserOpsNoDeploymentResults }
}

async function main() {
    const pmDepositRes = await deposit_paymaster()
    if (pmDepositRes !== "success") {
        throw new Error("Paymaster Deposit failed")
    }

    // Initialize Total Supply of mockToken, to get accurate and consistent gas results in further operations.
    const res = await initializeTokenSupply(account.address)
    if (res !== "success") {
        throw new Error("Mock Token totalSupply initialization failed")
    }

    const { kernelAccount, kernelClient } = await generatePrefundedKernelAccount()

    let singleOpWithDeploymentResults: GasResult | undefined
    let singleOpNoDeploymentResults: GasResult | undefined
    try {
        ;({ singleOpWithDeploymentResults, singleOpNoDeploymentResults } = await singleUserOperationGasResult(
            kernelAccount,
            kernelClient,
        ))
    } catch (error) {
        console.error("Single UserOp: ", error)
    }

    let multipleCallsNoDeploymentResults: GasResult | undefined
    try {
        multipleCallsNoDeploymentResults = await multipleCallsGasResult(kernelAccount, kernelClient)
    } catch (error) {
        console.error("Batched CallData: ", error)
    }

    let multipleUserOpsNoDeploymentSameSenderResults: GasResult | undefined
    try {
        multipleUserOpsNoDeploymentSameSenderResults = await batchedUserOpsSameSenderGasResult(
            kernelAccount,
            kernelClient,
        )
    } catch (error) {
        console.error("Batched CallData Same Sender: ", error)
    }

    let multipleUserOpsWithDeploymentResults: GasResult | undefined
    let multipleUserOpsNoDeploymentResults: GasResult | undefined
    try {
        ;({ multipleUserOpsWithDeploymentResults, multipleUserOpsNoDeploymentResults } =
            await batchedUserOperationsGasResult())
    } catch (error) {
        console.error("Batched UserOps Different Senders: ", error)
    }

    const gasUsageResults = [
        singleOpWithDeploymentResults,
        multipleUserOpsWithDeploymentResults,
        singleOpNoDeploymentResults,
        multipleCallsNoDeploymentResults,
        multipleUserOpsNoDeploymentResults,
        multipleUserOpsNoDeploymentSameSenderResults,
    ].filter((result): result is GasResult => result !== undefined)

    console.log("\nGas Usage Results Comparison Table :-")
    console.table(
        gasUsageResults.map((result) => ({
            Scenario: result.scenario,
            "Direct Tx Gas": result.directTxGas.toLocaleString("en-US"),
            "Total UserOp Gas": result.totalUserOpGas.toLocaleString("en-US"),
            "Bundler Tx Gas": result.bundlerTxGas.toLocaleString("en-US"),
            "Bundler Overhead": result.bundlerOverhead.toLocaleString("en-US"),
            "UserOp Overhead": result.userOpOverhead.toLocaleString("en-US"),
            "Total Overhead": result.totalOverhead.toLocaleString("en-US"),
            "SCA Deployment Overhead": result.accountDeploymentOverhead.toLocaleString("en-US"),
        })),
    )
}

main().then(() => {
    process.exit(0)
})
