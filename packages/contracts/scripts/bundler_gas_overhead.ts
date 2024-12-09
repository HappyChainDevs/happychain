import type { UserOperation, UserOperationCall, UserOperationReceipt } from "viem/account-abstraction"
import { localhost } from "viem/chains"

import type { SmartAccountClient } from "permissionless"
import { deployment } from "../deployments/anvil/testing/abis"

import { VALIDATOR_MODE, VALIDATOR_TYPE, getCustomNonce } from "./getNonce"

import { createMintCall, depositPaymaster, initializeTokenSupply } from "./utils/accounts"
import { account, pimlicoClient, publicClient, walletClient } from "./utils/clients"
import { generatePrefundedKernelClient, generatePrefundedKernelClients } from "./utils/kernel"

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

// An empty hex string to be used when signing over a userOperation.
const EMPTY_SIGNATURE = "0x"

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

async function processSingleUserOp(kernelClient: SmartAccountClient, calls: UserOperationCall[]) {
    const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
        account: kernelClient.account!,
        calls,
    })

    const paymasterGasEstimates = await pimlicoClient.estimateUserOperationGas({
        ...userOp,
    })

    const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: await kernelClient.sendUserOperation({
            account: kernelClient.account!,
            calls,
        }),
    })

    if (!receipt.success) {
        throw new Error("Validation using custom validator module failed")
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

async function sendUserOps(kernelClients: SmartAccountClient[]) {
    // Prepare and sign all user operations upfront to send them concurrently.
    // This increases the chance they are included in the same bundle.
    const userOps: UserOperation<"0.7">[] = await Promise.all(
        kernelClients.map(async (kernelClient) => {
            const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
                account: kernelClient.account!,
                calls: [createMintCall(kernelClient.account!.address)],
            })

            userOp.signature = await kernelClient.account!.signUserOperation({
                ...userOp,
                chainId: localhost.id,
                signature: EMPTY_SIGNATURE, // The signature field must be empty when hashing and signing the user operation.
            })

            return userOp
        }),
    )

    const hashes = await Promise.all(
        kernelClients.map((kernelClient, idx) => kernelClient.sendUserOperation(userOps[idx])),
    )

    const receipts: UserOperationReceipt[] = await Promise.all(
        kernelClients.map((kernelClient, idx) =>
            kernelClient.waitForUserOperationReceipt({
                hash: hashes[idx],
            }),
        ),
    )

    // Group receipts by block hash and transaction hash to ensure unique bundle identification
    const bundleGroups = receipts.reduce(
        (groups, receipt) => {
            const key = `${receipt.receipt.blockHash}_${receipt.receipt.transactionHash}`
            if (!groups[key]) {
                groups[key] = []
            }
            groups[key].push(receipt)
            return groups
        },
        {} as Record<string, typeof receipts>,
    )

    const largestBundleKey = Object.entries(bundleGroups).sort(([, a], [, b]) => b.length - a.length)[0][0]
    const filteredReceipts = bundleGroups[largestBundleKey]

    console.log(`Total Bundle Tx GasUsed: ${filteredReceipts[0].receipt.gasUsed}`)
    const avgBundleTxGas = filteredReceipts[0].receipt.gasUsed / BigInt(filteredReceipts.length)
    console.log(`per UserOp Bundle Tx GasUsed: ${avgBundleTxGas}`)
    filteredReceipts.forEach((receipt, idx) => {
        console.log(`UserOp [${idx}]`)
        console.log(`    ActualGas: ${receipt.actualGasUsed.toLocaleString("en-US")}`)
        console.log(
            `    ActualGas - AvgBundlerTxGas: ${(receipt.actualGasUsed - avgBundleTxGas).toLocaleString("en-US")}`,
        )
    })
    console.log("\n")

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

async function singleUserOperationGasResult(kernelClient: SmartAccountClient) {
    console.log("\nGas Usage for a Single UserOp (with Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails1 = await processSingleUserOp(kernelClient, [createMintCall(kernelClient.account!.address)])
    const singleOpWithDeploymentResults = {
        scenario: "Single UserOp with 1 call (with Deployment)",
        ...gasDetails1,
        accountDeploymentOverhead: 0n,
    }

    console.log("\nGas Usage for a Single UserOp (no Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails2 = await processSingleUserOp(kernelClient, [createMintCall(kernelClient.account!.address)])
    const singleOpNoDeploymentResults = {
        scenario: "Single UserOp with 1 call (no Deployment)",
        ...gasDetails2,
        accountDeploymentOverhead: 0n,
    }

    singleOpWithDeploymentResults.accountDeploymentOverhead =
        singleOpWithDeploymentResults.totalOverhead - singleOpNoDeploymentResults.totalOverhead
    return { singleOpWithDeploymentResults, singleOpNoDeploymentResults }
}

async function multipleCallsGasResult(kernelClient: SmartAccountClient) {
    const calls = Array(5)
        .fill(null)
        .map(() => createMintCall(kernelClient.account!.address))

    console.log("\nGas Usage for a Single UserOp with 5 Calls (no Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails2 = await processSingleUserOp(kernelClient, calls)
    return {
        scenario: "Single UserOp with 5 calls (no Deployment)",
        ...gasDetails2,
        accountDeploymentOverhead: 0n,
    }
}

async function batchedUserOpsSameSenderGasResult(kernelClient: SmartAccountClient) {
    const nonces = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
            getCustomNonce(
                walletClient,
                kernelClient.account!.address,
                deployment.ECDSAValidator,
                BigInt(i),
                VALIDATOR_MODE.DEFAULT,
                VALIDATOR_TYPE.ROOT,
            ),
        ),
    )

    const userOps: UserOperation<"0.7">[] = await Promise.all(
        nonces.map(async (nonce) => {
            const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
                account: kernelClient.account!,
                calls: [createMintCall(kernelClient.account!.address)],
                nonce: nonce,
            })

            userOp.signature = await kernelClient.account!.signUserOperation({
                ...userOp,
                chainId: localhost.id,
                signature: EMPTY_SIGNATURE,
            })

            return userOp
        }),
    )

    const hashes = await Promise.all(userOps.map((userOp) => kernelClient.sendUserOperation(userOp)))

    const receipts = await Promise.all(hashes.map((hash) => kernelClient.waitForUserOperationReceipt({ hash })))

    // Group receipts by block hash and transaction hash to ensure unique bundle identification
    const bundleGroups = receipts.reduce(
        (groups, receipt) => {
            const key = `${receipt.receipt.blockHash}_${receipt.receipt.transactionHash}`
            if (!groups[key]) {
                groups[key] = []
            }
            groups[key].push(receipt)
            return groups
        },
        {} as Record<string, typeof receipts>,
    )

    const largestBundleKey = Object.entries(bundleGroups).sort(([, a], [, b]) => b.length - a.length)[0][0]

    const filteredReceipts = bundleGroups[largestBundleKey]

    const { numOps, gasDetails } = await calculateGasDetails(filteredReceipts)
    console.log("\nGas Usage per UserOp (no Deployment) from the same Sender:")
    console.log(`(Processed ${numOps} UserOps in the largest bundle)`)
    console.log("---------------------------------------------------------------------\n")

    receipts.forEach((receipt, index) => {
        console.log(
            `UserOp ${index + 1}: Block #${receipt.receipt.blockNumber}, Tx Index: ${receipt.receipt.transactionIndex}`,
        )
    })
    console.log("\n")

    console.log(`Total Bundle Tx GasUsed: ${filteredReceipts[0].receipt.gasUsed}`)
    const avgBundleTxGas = filteredReceipts[0].receipt.gasUsed / BigInt(receipts.length)
    console.log(`per UserOp Bundle Tx GasUsed: ${avgBundleTxGas}`)
    filteredReceipts.forEach((receipt, idx) => {
        console.log(`UserOp [${idx}]`)
        console.log(`    ActualGas: ${receipt.actualGasUsed.toLocaleString("en-US")}`)
        console.log(
            `    ActualGas - AvgBundlerTxGas: ${(receipt.actualGasUsed - avgBundleTxGas).toLocaleString("en-US")}`,
        )
    })
    console.log("\n")

    printUserOperationGasDetails(gasDetails)

    return {
        scenario: `Avg UserOp in a Bundle of ${numOps} UserOps (same sender)`,
        ...gasDetails,
        accountDeploymentOverhead: 0n,
    }
}

async function batchedUserOperationsGasResult() {
    const kernelClients = await generatePrefundedKernelClients(5)
    console.log("\nGas Usage per UserOp (with Deployment) from different Senders:")
    console.log("---------------------------------------------------------------------\n")
    const { numOps: numOps1, gasDetails: gasDetails1 } = await sendUserOps(kernelClients)
    console.log(`(Processed ${numOps1} UserOps in this bundle, each from a different sender)\n`)
    printUserOperationGasDetails(gasDetails1)

    console.log("\nGas Usage per UserOp (no Deployment) from different Senders:")
    console.log("---------------------------------------------------------------------\n")
    const { numOps: numOps2, gasDetails: gasDetails2 } = await sendUserOps(kernelClients)
    console.log(`(Processed ${numOps2} UserOps in this bundle, each from a different sender)\n`)
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

async function initializePaymasterState() {
    const kernelClient = await generatePrefundedKernelClient()
    await processSingleUserOp(kernelClient, [createMintCall()])
}

async function main() {
    const pmDepositRes = await depositPaymaster()
    if (pmDepositRes !== "success") {
        throw new Error("Paymaster Deposit failed")
    }

    await initializePaymasterState()

    // Initialize Total Supply of mockToken, to get accurate and consistent gas results in further operations.
    const res = await initializeTokenSupply(account.address)
    if (res !== "success") {
        throw new Error("Mock Token totalSupply initialization failed")
    }

    const kernelClient = await generatePrefundedKernelClient()

    let singleOpWithDeploymentResults: GasResult | undefined
    let singleOpNoDeploymentResults: GasResult | undefined
    try {
        ;({ singleOpWithDeploymentResults, singleOpNoDeploymentResults } =
            await singleUserOperationGasResult(kernelClient))
    } catch (error) {
        console.error("Single UserOp: ", error)
    }

    let multipleCallsNoDeploymentResults: GasResult | undefined
    try {
        multipleCallsNoDeploymentResults = await multipleCallsGasResult(kernelClient)
    } catch (error) {
        console.error("Batched CallData: ", error)
    }

    let multipleUserOpsNoDeploymentSameSenderResults: GasResult | undefined
    try {
        multipleUserOpsNoDeploymentSameSenderResults = await batchedUserOpsSameSenderGasResult(kernelClient)
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
