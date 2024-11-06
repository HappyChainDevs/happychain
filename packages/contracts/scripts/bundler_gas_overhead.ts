import { type Address, type Hex, type PrivateKeyAccount, type WalletClient, encodeFunctionData } from "viem"
import { http, createPublicClient, createWalletClient, parseEther } from "viem"
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
                    paymasterVerificationGasLimit: 10_000n, // Increased value to account for possible higher gas usage
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

async function prepareAndSendUserOps(accounts: Accounts[]) {
    const userOps = await Promise.all(accounts.map(async ({ kernelAccount, kernelClient }) => {
        const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
            account: kernelAccount,
            calls: [createMintCall()],
        })

        userOp.signature = await kernelAccount.signUserOperation({
            ...userOp,
            chainId: localhost.id,
            signature: "0x",
        })

        return userOp
    }))

    const hashes = await Promise.all(userOps.map(async (userOp, index) => {
        return await accounts[index].kernelClient.sendUserOperation({
            ...userOp,
        })
    }))

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

async function sendUserOps(accounts: Accounts[]) {
    const timings: {
        account: string;
        prepareTime: Date;
        sendTime: Date;
        receiveTime?: Date;
        hash: string;
        totalDuration?: number;
    }[] = [];

    // Send userOps concurrently and log timings
    const hashes = await Promise.all(
        accounts.map((account) =>
            (async () => {
                const prepareTime = new Date();
                console.log(`Preparing userOp for account ${account.kernelAccount.address} at ${prepareTime.toISOString()}`);

                // Start timing the preparation and sending
                const startTime = Date.now();

                const hash = await account.kernelClient.sendUserOperation({
                    account: account.kernelAccount,
                    calls: [createMintCall()],
                });

                const sendTime = new Date();
                const sendDuration = Date.now() - startTime;
                console.log(`Sent userOp for account ${account.kernelAccount.address} at ${sendTime.toISOString()}`);
                console.log(`Time taken to prepare and send userOp for account ${account.kernelAccount.address}: ${sendDuration} ms`);

                // Store timing information
                timings.push({
                    account: account.kernelAccount.address,
                    prepareTime,
                    sendTime,
                    hash,
                });

                return hash;
            })(),
        ),
    );

    // Wait for receipts concurrently and log timings
    const receipts: UserOperationReceipt[] = await Promise.all(
        accounts.map((account, idx) =>
            (async () => {
                console.log(`Waiting for receipt of userOp from account ${account.kernelAccount.address} at ${new Date().toISOString()}`);

                // Start timing the receipt waiting
                const startWaitTime = Date.now();

                const receipt = await account.kernelClient.waitForUserOperationReceipt({
                    hash: hashes[idx],
                });

                const receiveTime = new Date();
                const receiveDuration = Date.now() - startWaitTime;
                console.log(`Received receipt for userOp from account ${account.kernelAccount.address} at ${receiveTime.toISOString()}`);
                console.log(`Time taken to receive receipt for account ${account.kernelAccount.address}: ${receiveDuration} ms`);

                // Update timing information
                const timing = timings.find((t) => t.account === account.kernelAccount.address);
                if (timing) {
                    timing.receiveTime = receiveTime;
                    timing.totalDuration = receiveTime.getTime() - timing.prepareTime.getTime();
                }

                return receipt;
            })(),
        ),
    );

    // Log the collected timing details
    console.log('\n--- User Operation Timings ---');
    timings.forEach((t) => {
        console.log(`Account: ${t.account}`);
        console.log(`  Prepared at: ${t.prepareTime.toISOString()}`);
        console.log(`  Sent at:     ${t.sendTime.toISOString()}`);
        if (t.receiveTime) {
            console.log(`  Receipt received at: ${t.receiveTime.toISOString()}`);
            console.log(`  Total time from preparation to receipt: ${t.totalDuration} ms`);
        }
        console.log('-------------------------------------');
    });

    const dominantTransactionIndex = receipts
        .map((r) => r.receipt.transactionIndex)
        .sort(
            (a, b) =>
                receipts.filter((r) => r.receipt.transactionIndex === b).length -
                receipts.filter((r) => r.receipt.transactionIndex === a).length,
        )[0]

    const filteredReceipts = receipts.filter((receipt) => receipt.receipt.transactionIndex === dominantTransactionIndex)

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
    const multipleCallsNoDeploymentResults = {
        scenario: "Single UserOp with 5 calls (no Deployment)",
        ...gasDetails2,
        accountDeploymentOverhead: 0n,
    }

    return multipleCallsNoDeploymentResults
}

async function batchedUserOperationsGasResult() {
    const accounts = await generatePrefundedKernelAccounts(5)
    const { numOps: numOps1, gasDetails: gasDetails1 } = await sendUserOps(accounts)
    const { numOps: numOps2, gasDetails: gasDetails2 } = await sendUserOps(accounts)



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

    let multipleUserOpsWithDeploymentResults: GasResult | undefined
    let multipleUserOpsNoDeploymentResults: GasResult | undefined
    try {
        ;({ multipleUserOpsWithDeploymentResults, multipleUserOpsNoDeploymentResults } =
            await batchedUserOperationsGasResult())
    } catch (error) {
        console.error("Batched UserOps: ", error)
    }

    const gasUsageResults = [
        singleOpWithDeploymentResults,
        multipleUserOpsWithDeploymentResults,
        singleOpNoDeploymentResults,
        multipleCallsNoDeploymentResults,
        multipleUserOpsNoDeploymentResults,
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
