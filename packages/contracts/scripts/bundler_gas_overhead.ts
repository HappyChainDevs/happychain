import type { Address, Hex, PrivateKeyAccount, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient, parseEther } from "viem"
import type {
    GetPaymasterDataParameters,
    GetPaymasterStubDataParameters,
    SmartAccount,
    UserOperation,
    UserOperationCall,
} from "viem/account-abstraction"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { type Erc7579Actions, erc7579Actions } from "permissionless/actions/erc7579"
import { createPimlicoClient } from "permissionless/clients/pimlico"

import { abis, deployment } from "../deployments/anvil/testing/abis"

const privateKey = process.env.PRIVATE_KEY_LOCAL as Hex
const bundlerRpc = process.env.BUNDLER_LOCAL
const rpcURL = process.env.RPC_LOCAL

if (!privateKey || !bundlerRpc || !rpcURL) {
    throw new Error("Missing environment variables")
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

function createEthTransferCall(): UserOperationCall {
    return {
        to: getRandomAccount(),
        value: parseEther(AMOUNT),
        data: "0x",
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
    const txHash = await walletClient.sendTransaction({
        account: account,
        to: accountAddress,
        chain: localhost,
        value: parseEther("0.1"),
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    return receipt.status
}

async function deposit_paymaster(): Promise<string> {
    const txHash = await walletClient.writeContract({
        address: entryPoint07Address,
        abi: abis.EntryPointV7,
        functionName: "depositTo",
        args: [deployment.HappyPaymaster],
        value: parseEther("10"),
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    return receipt.status
}

async function sendDirectTransactions(count = 1): Promise<bigint> {
    const receiverAddress = getRandomAccount()
    let totalGas = 0n

    for (let i = 0; i < count; i++) {
        const txHash = await walletClient.sendTransaction({
            account: account,
            to: receiverAddress,
            chain: localhost,
            value: parseEther(AMOUNT),
        })

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
        })
        totalGas += receipt.gasUsed
    }

    return totalGas
}

interface Accounts {
    kernelAccount: SmartAccount
    kernelClient: SmartAccountClient
}

interface UserOpReceipt {
    actualGasUsed: bigint
    receipt: {
        gasUsed: bigint
        transactionIndex: number
    }
}

interface GasResult {
    scenario: string
    directTxnGas: bigint
    actualGasUsed: bigint
    txnGasUsed: bigint
    bundlerOverhead: bigint
    extraCost: bigint
    numberOfUserOps: number
}

async function singleUserOperationGasResult() {
    console.log("\nSending a Single User Operation (Smart Account already Deployed):")
    console.log("----------------------------------------------------------------------------------\n")

    const { kernelAccount, kernelClient } = await generatePrefundedKernelAccount()
    const { receipt, directTxnGas } = await sendAndProcessUserOp(kernelAccount, kernelClient, [createEthTransferCall()])
    const singleOpDeploymentResults = createGasResult(
        "Single UserOp with 1 call",
        directTxnGas,
        receipt.actualGasUsed,
        receipt.receipt.gasUsed,
        1,
    )

    const { receipt: receipt1, directTxnGas: directTxnGas1 } = await sendAndProcessUserOp(kernelAccount, kernelClient, [
        createEthTransferCall(),
    ])
    const singleOpNoDeploymentResults = createGasResult(
        "Single UserOp with 1 call",
        directTxnGas1,
        receipt1.actualGasUsed,
        receipt1.receipt.gasUsed,
        1,
    )

    return { singleOpDeploymentResults, singleOpNoDeploymentResults }
}

async function batchedCallsGasResult() {
    console.log("\nSending a Single UserOp with 5 transfer Calls (Smart Account already Deployed) :-")
    console.log("----------------------------------------------------------------------------------\n")

    const { kernelAccount, kernelClient } = await generatePrefundedKernelAccount()
    const calls = Array(5)
        .fill(null)
        .map(() => createEthTransferCall())
    const { receipt, directTxnGas } = await sendAndProcessUserOp(kernelAccount, kernelClient, calls)

    const batchedCallsDeploymentResults = createGasResult(
        "Single UserOp with 5 calls",
        directTxnGas,
        receipt.actualGasUsed,
        receipt.receipt.gasUsed,
        1,
    )

    const { receipt: receipt1, directTxnGas: directTxnGas1 } = await sendAndProcessUserOp(
        kernelAccount,
        kernelClient,
        calls,
    )
    const batchedCallsNoDeploymentResults = createGasResult(
        "Single UserOp with 5 calls",
        directTxnGas1,
        receipt1.actualGasUsed,
        receipt1.receipt.gasUsed,
        1,
    )

    return { batchedCallsDeploymentResults, batchedCallsNoDeploymentResults }
}

async function sendAndProcessUserOp(
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

    const directTxnGas = await sendDirectTransactions(calls.length)
    const bundlerOverhead = receipt.actualGasUsed - receipt.receipt.gasUsed
    const userOpOverhead = receipt.actualGasUsed - directTxnGas

    printPaymasterGasEstimates(
        paymasterGasEstimates.preVerificationGas,
        paymasterGasEstimates.verificationGasLimit,
        paymasterGasEstimates.callGasLimit,
    )

    printUserOperationGasDetails(
        receipt.actualGasUsed,
        receipt.receipt.gasUsed,
        bundlerOverhead,
        directTxnGas,
        userOpOverhead,
    )

    return {
        receipt,
        directTxnGas,
    }
}

async function batchedUserOperationsGasResult() {
    const accounts = await generatePrefundedKernelAccounts(5)

    const {
        receipts: receipts1,
        totalActualGas: totalActualGas1,
        directTxnGas: directTxnGas1,
    } = await processUserOps(accounts)

    console.log("\nSending multiple UserOps from unique senders (Smart Accounts NOT Deployed) :-")
    console.log("----------------------------------------------------------------------------------\n")
    console.log(`(Bundle contains ${receipts1.length} UserOps)`)
    printUserOperationGasDetails(
        totalActualGas1,
        receipts1[0].receipt.gasUsed,
        totalActualGas1 - receipts1[0].receipt.gasUsed,
        directTxnGas1,
        totalActualGas1 - directTxnGas1,
    )

    const {
        receipts: receipts2,
        totalActualGas: totalActualGas2,
        directTxnGas: directTxnGas2,
    } = await processUserOps(accounts)

    console.log("Sending multiple UserOps from unique senders (Smart Accounts Deployed) :-")
    console.log("----------------------------------------------------------------------------------\n")
    console.log(`(Bundle contains ${receipts2.length} UserOps)`)

    printUserOperationGasDetails(
        totalActualGas2,
        receipts2[0].receipt.gasUsed,
        totalActualGas2 - receipts2[0].receipt.gasUsed,
        directTxnGas2,
        totalActualGas2 - directTxnGas2,
    )

    const multipleUserOpsDeploymentResults = createGasResult(
        "Multiple UserOps with Deployment",
        directTxnGas1,
        totalActualGas1,
        receipts1[0].receipt.gasUsed,
        receipts1.length,
    )

    const multipleUserOpsNoDeploymentResults = createGasResult(
        "Multiple UserOps without Deployment",
        directTxnGas2,
        totalActualGas2,
        receipts2[0].receipt.gasUsed,
        receipts2.length,
    )

    return { multipleUserOpsDeploymentResults, multipleUserOpsNoDeploymentResults }
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

async function processUserOps(
    accounts: Accounts[],
): Promise<{ receipts: UserOpReceipt[]; totalActualGas: bigint; directTxnGas: bigint }> {
    const hashes = await Promise.all(
        accounts.map((account) =>
            account.kernelClient.sendUserOperation({
                account: account.kernelAccount,
                calls: [createEthTransferCall()],
            }),
        ),
    )

    const receipts: UserOpReceipt[] = await Promise.all(
        accounts.map((account, idx) =>
            account.kernelClient.waitForUserOperationReceipt({
                hash: hashes[idx],
            }),
        ),
    )

    const dominantTransactionIndex =
        receipts.filter((r) => r.receipt.transactionIndex === 0).length >=
        receipts.filter((r) => r.receipt.transactionIndex === 1).length
            ? 0
            : 1

    const filteredReceipts = receipts.filter((receipt) => receipt.receipt.transactionIndex === dominantTransactionIndex)

    const totalActualGas = filteredReceipts.reduce((acc, receipt) => acc + receipt.actualGasUsed, BigInt(0))
    const directTxnGas = await sendDirectTransactions(filteredReceipts.length)

    return { receipts: filteredReceipts, totalActualGas, directTxnGas }
}

function createGasResult(
    scenario: string,
    directTxnGas: bigint,
    totalActualGas: bigint,
    txnGasUsed: bigint,
    numOps: number,
) {
    return {
        scenario,
        directTxnGas,
        actualGasUsed: totalActualGas,
        txnGasUsed,
        bundlerOverhead: totalActualGas - txnGasUsed,
        extraCost: totalActualGas - directTxnGas,
        numberOfUserOps: numOps,
    }
}

function printPaymasterGasEstimates(preVerificationGas: bigint, verificationGasLimit: bigint, callGasLimit: bigint) {
    console.log("Estimated UserOperation Gas:")
    console.log(`  PreVerificationGas:   ${preVerificationGas.toLocaleString()} gas`)
    console.log(`  VerificationGasLimit: ${verificationGasLimit.toLocaleString()} gas`)
    console.log(`  CallGasLimit:         ${callGasLimit.toLocaleString()} gas`)
}

function printUserOperationGasDetails(
    actualGasUsed: bigint,
    txnGasUsed: bigint,
    bundlerOverhead: bigint,
    directTxnGas: bigint,
    extraCost: bigint,
) {
    console.log("User Operation Gas Details:")
    console.log(`  Actual Gas Used:        ${actualGasUsed.toLocaleString()} gas`)
    console.log(`  Transaction Gas Used:   ${txnGasUsed.toLocaleString()} gas`)
    console.log(`  Bundler Overhead:       ${bundlerOverhead.toLocaleString()} gas`)
    console.log(`  Direct Transaction Gas: ${directTxnGas.toLocaleString()} gas`)
    console.log(`  Extra Cost:             ${extraCost.toLocaleString()} gas`)
}

async function main() {
    const pmDepositRes = await deposit_paymaster()
    if (pmDepositRes !== "success") {
        throw new Error("Paymaster Deposit failed")
    }

    let singleOpDeploymentResults: GasResult | undefined
    let singleOpNoDeploymentResults: GasResult | undefined
    try {
        ;({ singleOpDeploymentResults, singleOpNoDeploymentResults } = await singleUserOperationGasResult())
    } catch (error) {
        console.error("Single UserOp: ", error)
    }

    let batchedCallsDeploymentResults: GasResult | undefined
    let batchedCallsNoDeploymentResults: GasResult | undefined
    try {
        ;({ batchedCallsDeploymentResults, batchedCallsNoDeploymentResults } = await batchedCallsGasResult())
    } catch (error) {
        console.error("Batched CallData: ", error)
    }

    let multipleUserOpsDeploymentResults: GasResult | undefined
    let multipleUserOpsNoDeploymentResults: GasResult | undefined
    try {
        ;({ multipleUserOpsDeploymentResults, multipleUserOpsNoDeploymentResults } =
            await batchedUserOperationsGasResult())
    } catch (error) {
        console.error("Batched UserOps: ", error)
    }

    const gasUsageResults = [
        singleOpDeploymentResults,
        singleOpNoDeploymentResults,
        batchedCallsDeploymentResults,
        batchedCallsNoDeploymentResults,
        multipleUserOpsDeploymentResults,
        multipleUserOpsNoDeploymentResults,
    ].filter((result): result is GasResult => result !== undefined)

    console.log("\nGas Usage Results Comparison Table :-")
    console.table(
        gasUsageResults.map((result) => ({
            Scenario: result.scenario,
            "Direct Txn Gas": result.directTxnGas,
            ActualGasUsed: result.actualGasUsed,
            "Txn.gasUsed": result.txnGasUsed,
            "Bundler Overhead": result.bundlerOverhead,
            "Extra Cost (vs Direct)": result.extraCost,
            "#UserOps": result.numberOfUserOps,
        })),
    )
}
main().then(() => {
    process.exit(0)
})
