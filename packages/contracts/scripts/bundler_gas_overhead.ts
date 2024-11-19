import {
    http,
    type Address,
    type Hex,
    type PrivateKeyAccount,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    parseEther,
} from "viem"
import type {
    GetPaymasterDataParameters,
    GetPaymasterStubDataParameters,
    SmartAccount,
    UserOperation,
    UserOperationCall,
    UserOperationReceipt,
} from "viem/account-abstraction"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { type Erc7579Actions, erc7579Actions } from "permissionless/actions/erc7579"
import { createPimlicoClient } from "permissionless/clients/pimlico"

import { abis as mockAbis, deployment as mockDeployment } from "../deployments/anvil/mockTokens/abis"
import { abis, deployment } from "../deployments/anvil/testing/abis"
import { VALIDATOR_MODE, VALIDATOR_TYPE, getCustomNonce } from "./getNonce.ts"

const privateKey = process.env.PRIVATE_KEY_LOCAL as Hex
const bundlerRpc = process.env.BUNDLER_LOCAL
const rpcURL = process.env.RPC_LOCAL

if (!privateKey || !bundlerRpc || !rpcURL) {
    throw new Error("Missing environment variables")
}

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

const account = privateKeyToAccount(privateKey)

const walletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http(rpcURL),
})

const publicClient = createPublicClient({
    chain: localhost,
    transport: http(rpcURL),
})

const pimlicoClient = createPimlicoClient({
    chain: localhost,
    transport: http(bundlerRpc),
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
    },
})

const AMOUNT = "0.01"
const EMPTY_SIGNATURE = "0x"

function getRandomAccount() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Hex
}

function createMintCall(): UserOperationCall {
    return {
        to: mockDeployment.MockTokenA,
        value: 0n,
        data: encodeFunctionData({
            abi: mockAbis.MockTokenA,
            functionName: "mint",
            args: [getRandomAccount(), parseEther(AMOUNT)],
        }),
    }
}

async function getKernelAccount(client: WalletClient, account: PrivateKeyAccount): Promise<SmartAccount> {
    return toEcdsaKernelSmartAccount({
        client,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        owners: [account],
        version: "0.3.1",
        ecdsaValidatorAddress: deployment.ECDSAValidator,
        accountLogicAddress: deployment.Kernel,
        factoryAddress: deployment.KernelFactory,
        metaFactoryAddress: deployment.FactoryStaker,
    })
}

function getKernelClient(kernelAccount: SmartAccount): SmartAccountClient & Erc7579Actions<SmartAccount> {
    const paymasterAddress = deployment.HappyPaymaster

    const kernelClientBase = createSmartAccountClient({
        account: kernelAccount,
        chain: localhost,
        bundlerTransport: http(bundlerRpc, {
            timeout: 30_000,
        }),
        paymaster: {
            async getPaymasterData(parameters: GetPaymasterDataParameters) {
                const gasEstimates = await pimlicoClient.estimateUserOperationGas({
                    ...parameters,
                    paymaster: paymasterAddress,
                })

                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x", // Only required for extra context, no need to encode paymaster gas values manually
                    paymasterVerificationGasLimit: gasEstimates.paymasterVerificationGasLimit ?? 0n,
                    paymasterPostOpGasLimit: gasEstimates.paymasterPostOpGasLimit ?? 0n,
                }
            },

            // Using stub values from the docs for paymaster-related fields in unsigned user operations for gas estimation.
            async getPaymasterStubData(_parameters: GetPaymasterStubDataParameters) {
                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x",
                    paymasterVerificationGasLimit: 80_000n, // Increased value to account for possible higher gas usage
                    paymasterPostOpGasLimit: 0n, // Set to 0 since the postOp function is never called
                }
            },
        },
        userOperation: {
            estimateFeesPerGas: async () => {
                return await publicClient.estimateFeesPerGas()
            },
        },
    })

    const extendedClient = kernelClientBase.extend(erc7579Actions())
    return extendedClient as typeof kernelClientBase & typeof extendedClient
}

async function fund_smart_account(accountAddress: Address): Promise<string> {
    const hash = await walletClient.sendTransaction({
        account: account,
        to: accountAddress,
        chain: localhost,
        value: parseEther("0.1"),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt.status
}

async function deposit_paymaster(): Promise<string> {
    const hash = await walletClient.writeContract({
        address: entryPoint07Address,
        abi: abis.EntryPointV7,
        functionName: "depositTo",
        args: [deployment.HappyPaymaster],
        value: parseEther("10"),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt.status
}

async function initialize_total_supply(): Promise<string> {
    const hash = await walletClient.writeContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "mint",
        args: [getRandomAccount(), parseEther(AMOUNT)],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt.status
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

async function generatePrefundedKernelAccounts(count: number) {
    const accounts = []
    for (let i = 0; i < count; i++) {
        const { kernelAccount, kernelClient } = await generatePrefundedKernelAccount()
        accounts.push({ kernelAccount, kernelClient })
    }
    return accounts
}

async function generatePrefundedKernelAccount(): Promise<{
    kernelAccount: SmartAccount
    kernelClient: SmartAccountClient
}> {
    const account = privateKeyToAccount(generatePrivateKey())

    const walletClient = createWalletClient({
        account: account,
        chain: localhost,
        transport: http(rpcURL),
    })

    const kernelAccount: SmartAccount = await getKernelAccount(walletClient, account)
    const kernelAddress = await kernelAccount.getAddress()
    const kernelClient = getKernelClient(kernelAccount)

    const prefundRes = await fund_smart_account(kernelAddress)
    if (prefundRes !== "success") {
        throw new Error("Funding SmartAccount 1 failed")
    }

    return { kernelAccount, kernelClient }
}

async function processSingleUserOp(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient,
    calls: UserOperationCall[],
) {
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

async function sendUserOps(accounts: Accounts[]) {
    // Prepare and sign all user operations upfront to send them concurrently.
    // This increases the chance they are included in the same bundle.
    const userOps: UserOperation<"0.7">[] = await Promise.all(
        accounts.map(async (account) => {
            const userOp: UserOperation<"0.7"> = await account.kernelClient.prepareUserOperation({
                account: account.kernelAccount,
                calls: [createMintCall()],
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

    const dominantTransactionIndex = receipts
        .map((r) => r.receipt.transactionIndex)
        .sort(
            (a, b) =>
                receipts.filter((r) => r.receipt.transactionIndex === b).length -
                receipts.filter((r) => r.receipt.transactionIndex === a).length,
        )[0]

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
            ...createMintCall(),
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        totalGas += receipt.gasUsed
    }

    return totalGas
}

async function singleUserOperationGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    console.log("\nGas Usage for a Single UserOp (with Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails1 = await processSingleUserOp(kernelAccount, kernelClient, [createMintCall()])
    const singleOpWithDeploymentResults = {
        scenario: "Single UserOp with 1 call (with Deployment)",
        ...gasDetails1,
        accountDeploymentOverhead: 0n,
    }

    console.log("\nGas Usage for a Single UserOp (no Deployment):")
    console.log("---------------------------------------------------------------------\n")

    const gasDetails2 = await processSingleUserOp(kernelAccount, kernelClient, [createMintCall()])
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

    const gasDetails2 = await processSingleUserOp(kernelAccount, kernelClient, calls)
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

    const res = await initialize_total_supply()
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
