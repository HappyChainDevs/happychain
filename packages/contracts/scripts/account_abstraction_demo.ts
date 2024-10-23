import type { Address, Hex, PrivateKeyAccount, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient, formatEther, numberToHex, parseEther } from "viem"
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
import { getCustomNonce } from "./getNonce"

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

const sessionKey = generatePrivateKey()

const sessionAccount = privateKeyToAccount(sessionKey)

const sessionWallet = createWalletClient({
    account: sessionAccount,
    chain: localhost,
    transport: http(rpcURL),
})

// The address used when installing a validator module to signify that the module has no hooks.
// This is a special constant address that indicates the absence of any additional hooks.
const NO_HOOKS_ADDRESS = "0x0000000000000000000000000000000000000001"

// Function selector for transferring ETH from the smart account.
// The function selector must be whitelisted when installing a validator module to allow ETH transfers.
const EXECUTE_FUNCTION_SELECTOR = "0xe9ae5c53"

// A dummy constant representing the amount of ETH to transfer in the demo.
const AMOUNT = "0.01"

function toHexDigits(number: bigint, size: number): string {
    return numberToHex(number, { size }).slice(2)
}

function getRandomAccount() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Hex
}

async function checkBalance(receiver: Address): Promise<string> {
    const balance = await publicClient.getBalance({
        address: receiver,
        blockTag: "latest",
    })

    return formatEther(balance)
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

function getInitData(hookAddress: Address, validatorData: Hex, hookData: Hex, selectorData: Hex): Hex {
    /**
     * Reference: https://github.com/zerodevapp/kernel/blob/release/v3.1/src/Kernel.sol#L361-L366
     * The layout is :-
     * - 0x00 (00): hook address
     * - 0x14 (20): validatorData offset from 0x34
     * - 0x34 (52): hookData offset from 0x34
     * - 0x54 (84): selectorData offset from 0x34
     * - [0x14 + validatordataOffset] : validatorDataLength
     * - [0x34 + validatorDataOffset] : validatorData
     * - [0x14 + hookDataOffset]      : hookDataLength
     * - [0x34 + hookDataOffset]      : hookData
     * - [0x14 + selectorDataOffset]  : selectorDataLength
     * - [0x34 + selectorDataOffset]  : selectorData
     */

    const validatorDataLen = validatorData.slice(2).length / 2
    const hookDataLen = hookData.slice(2).length / 2
    const selectorDataLen = selectorData.slice(2).length / 2

    const hexValidatorDataLength = toHexDigits(BigInt(validatorDataLen), 32)
    const hexHookDataLength = toHexDigits(BigInt(hookDataLen), 32)
    const hexSelectorDataLength = toHexDigits(BigInt(selectorDataLen), 32)

    // validatorDataOffset = HookDataOffset.length + SelectorDataOffset.length + ValidatorDataLength.length
    const validatorDataOffset = 32 + 32 + 32
    const hexValidatorDataOffset = toHexDigits(BigInt(validatorDataOffset), 32)

    // hookDataOffset = validatorDataOffset + validatorData.length + hookDataLength.length
    const hookDataOffset = validatorDataOffset + validatorDataLen
    const hexHookDataOffset = toHexDigits(BigInt(hookDataOffset), 32)

    // selectorDataOffset = hookDataOffset + hookData.length + selectorDataLength.length
    const selectorDataOffset = hookDataOffset + 32 + hookDataLen + 32
    const hexSelectorDataOffset = toHexDigits(BigInt(selectorDataOffset), 32)

    // biome-ignore format: readability
    return (
        hookAddress + // starts with "0x"
        hexValidatorDataOffset +
        hexHookDataOffset +
        hexSelectorDataOffset +
        hexValidatorDataLength +
        validatorData.slice(2) +
        hexHookDataLength +
        hookData.slice(2) +
        hexSelectorDataLength +
        selectorData.slice(2)
    ) as Hex
}

async function installCustomModule(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
    sessionKey: Address,
) {
    const opHash = await kernelClient.installModule({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: getInitData(NO_HOOKS_ADDRESS, sessionKey, "0x", EXECUTE_FUNCTION_SELECTOR),
        nonce: await kernelAccount.getNonce(),
    })

    const rec = await kernelClient.waitForUserOperationReceipt({
        hash: opHash,
    })

    if (!rec.success) {
        throw new Error("Module Installation failed")
    }

    const isInstalled = await isCustomModuleInstalled(kernelClient)
    if (!isInstalled) {
        throw new Error("Module is not installed")
    }
}

async function uninstallCustomModule(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
) {
    const opHash = await kernelClient.uninstallModule({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: NO_HOOKS_ADDRESS,
        nonce: await kernelAccount.getNonce(),
    })

    const rec = await kernelClient.waitForUserOperationReceipt({
        hash: opHash,
    })

    if (!rec.success) {
        throw new Error("Module Uninstallation failed")
    }

    const isInstalled = await isCustomModuleInstalled(kernelClient)
    if (isInstalled) {
        throw new Error("Module is not uninstalled")
    }
}

async function isCustomModuleInstalled(actionsClient: Erc7579Actions<SmartAccount>): Promise<boolean> {
    return await actionsClient.isModuleInstalled({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: "0x",
    })
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

async function singleUserOperationGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    console.log("\n------------------------------------------------")
    console.log("Sending a Single User Operation (Smart Account already Deployed):")
    console.log("------------------------------------------------\n")

    const { receipt, directTxnGas } = await sendAndProcessUserOp(
        kernelAccount,
        kernelClient,
        [createEthTransferCall()],
        1,
    )

    return createGasResult("Single UserOp with 1 call", directTxnGas, receipt.actualGasUsed, receipt.receipt.gasUsed, 1)
}

async function batchedCallsGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    console.log("\n------------------------------------------------")
    console.log("Sending a Single UserOp with 5 transfer Calls (Smart Account already Deployed) :-")
    console.log("------------------------------------------------\n")

    const { receipt, directTxnGas } = await sendAndProcessUserOp(
        kernelAccount,
        kernelClient,
        [
            createEthTransferCall(),
            createEthTransferCall(),
            createEthTransferCall(),
            createEthTransferCall(),
            createEthTransferCall(),
        ],
        5,
    )

    return createGasResult(
        "Single UserOp with 5 calls",
        directTxnGas,
        receipt.actualGasUsed,
        receipt.receipt.gasUsed,
        1,
    )
}

async function sendAndProcessUserOp(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient,
    calls: UserOperationCall[],
    count: number,
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

    const directTxnGas = await sendDirectTransactions(count)
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

    console.log("\n------------------------------------------------")
    console.log("Sending multiple UserOps from unique senders (Smart Accounts NOT Deployed) :-")
    console.log("------------------------------------------------\n")
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

    console.log("\n------------------------------------------------")
    console.log("Sending multiple UserOps from unique senders (Smart Accounts Deployed) :-")
    console.log("------------------------------------------------\n")
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

async function testRootValidator(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    const receiverAddress = getRandomAccount()

    const txHash = await kernelClient.sendTransaction({
        account: kernelAccount,
        to: receiverAddress,
        chain: localhost,
        value: parseEther(AMOUNT),
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    if (receipt.status !== "success") {
        throw new Error("KernelClient transaction failed")
    }

    const balance = await checkBalance(receiverAddress)
    if (balance === AMOUNT) {
        console.log(`Using RootValidator: Balance is correct: ${balance} ETH`)
    } else {
        throw new Error(`Using RootValidator: Balance is not correct: ${balance} ETH`)
    }
}

async function testCustomValidator(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
    kernelAddress: Address,
) {
    const receiverAddress = getRandomAccount()
    const sessionSigner = await getKernelAccount(sessionWallet, sessionAccount)
    const customNonce = await getCustomNonce(kernelAccount.client, kernelAddress, deployment.SessionKeyValidator)

    await installCustomModule(kernelAccount, kernelClient, sessionAccount.address)

    const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
        account: kernelAccount,
        calls: [
            {
                to: receiverAddress,
                value: parseEther(AMOUNT),
                data: "0x",
            },
        ],
        nonce: customNonce,
    })

    userOp.signature = await sessionSigner.signUserOperation({
        ...userOp,
        chainId: localhost.id,
        signature: "0x", // The signature field must be empty when hashing and signing the user operation.
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

    const balance = await checkBalance(receiverAddress)
    if (balance === AMOUNT) {
        console.log(`Using CustomValidator: Balance is correct: ${balance} ETH`)
    } else {
        throw new Error(`Using CustomValidator: Balance is not correct: ${balance} ETH`)
    }

    await uninstallCustomModule(kernelAccount, kernelClient)
}

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount(walletClient, account)
    const kernelClient = getKernelClient(kernelAccount)
    const kernelAddress = await kernelAccount.getAddress()

    const prefundRes = await fund_smart_account(kernelAddress)
    if (prefundRes !== "success") {
        throw new Error("Funding SmartAccount failed")
    }

    const depositRes = await deposit_paymaster()
    if (depositRes !== "success") {
        throw new Error("Paymaster Deposit failed")
    }

    try {
        await testRootValidator(kernelAccount, kernelClient)
    } catch (error) {
        console.error("Root Validator: ", error)
    }

    try {
        await testCustomValidator(kernelAccount, kernelClient, kernelAddress)
    } catch (error) {
        console.error("Custom Validator: ", error)
    }

    console.log("\n------------------------------------------------")
    console.log("Gas Usage Results :-")
    console.log("------------------------------------------------")

    const singleOpResults = await (async () => {
        try {
            return await singleUserOperationGasResult(kernelAccount, kernelClient)
        } catch (error) {
            console.error("Single UserOp: ", error)
        }
    })()

    const batchedCallsResults = await (async () => {
        try {
            return await batchedCallsGasResult(kernelAccount, kernelClient)
        } catch (error) {
            console.error("Batched CallData: ", error)
        }
    })()

    let multipleUserOpsDeploymentResults: GasResult | undefined
    let multipleUserOpsNoDeploymentResults: GasResult | undefined
    try {
        ;({ multipleUserOpsDeploymentResults, multipleUserOpsNoDeploymentResults } =
            await batchedUserOperationsGasResult())
    } catch (error) {
        console.error("Batched UserOps: ", error)
    }

    const gasUsageResults = [
        singleOpResults,
        batchedCallsResults,
        multipleUserOpsDeploymentResults,
        multipleUserOpsNoDeploymentResults,
    ].filter((result): result is GasResult => result !== undefined)

    console.log("\n------------------------------------------------")
    console.log("\nGas Usage Results Comparison Table :-\n")
    console.log(
        "|-------------------------------------------------------------------------------------------------------------------------------------------|",
    )
    console.log(
        "| Scenario                             | Direct Txn Gas | ActualGasUsed | Txn.gasUsed | Bundler Overhead | Extra Cost (vs Direct)| #UserOps |",
    )
    console.log(
        "|--------------------------------------|----------------|---------------|-------------|------------------|-----------------------|----------|",
    )

    gasUsageResults.forEach((result) => {
        console.log(
            `| ${result.scenario.padEnd(36)} | ${result.directTxnGas.toString().padEnd(14)} | ${result.actualGasUsed.toString().padEnd(13)} | ${result.txnGasUsed.toString().padEnd(11)} | ${result.bundlerOverhead.toString().padEnd(16)} | ${result.extraCost.toString().padEnd(21)} | ${result.numberOfUserOps.toString().padEnd(8)} |`,
        )
    })
    console.log(
        "|-------------------------------------------------------------------------------------------------------------------------------------------|",
    )
}
main().then(() => {
    process.exit(0)
})
