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

const createEthTransferCall = (): UserOperationCall => ({
    to: getRandomAccount(),
    value: parseEther(AMOUNT),
    data: "0x",
})

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

async function singleUserOperationGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    console.log("\nSending a Single UserOp (Smart Account already Deployed):-")

    const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
        account: kernelAccount,
        calls: [createEthTransferCall()],
    })

    const paymasterGasEstimates = await pimlicoClient.estimateUserOperationGas({
        ...userOp,
    })
    console.log("\nPaymaster Gas Estimates :-")
    console.log("  PreVerificationGas: ", paymasterGasEstimates.preVerificationGas)
    console.log("  VerificationGasLimit: ", paymasterGasEstimates.verificationGasLimit)
    console.log("  CallGasLimit: ", paymasterGasEstimates.callGasLimit)

    userOp.signature = await kernelAccount.signUserOperation({
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

    console.log("\nUserOp via Bundler Receipt :-")
    console.log("  ActualGasUsed: ", receipt.actualGasUsed)
    console.log("  Txn.gasUsed: ", receipt.receipt.gasUsed)
    const bundlerOverhead = receipt.actualGasUsed - receipt.receipt.gasUsed
    console.log("\nBundler Overhead (Gas Used):", bundlerOverhead)
    const directTxnGas = await sendDirectTransactions(1)
    console.log("Direct Transaction Gas:", directTxnGas)
    const extraCostOfUsingUserOp = receipt.actualGasUsed - directTxnGas
    console.log("Extra Cost of Using a UserOp vs Direct Transaction (Gas):", extraCostOfUsingUserOp)
    console.log("------------------------------------------------\n")

    return {
        scenario: "Single UserOp",
        directTxnGas,
        actualGasUsed: receipt.actualGasUsed,
        txnGasUsed: receipt.receipt.gasUsed,
        bundlerOverhead,
        extraCost: extraCostOfUsingUserOp,
        numberOfUserOps: 1,
    }
}

async function batchedCallsGasResult(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    console.log("Sending a Single UserOp with 5 transfer Calls (Smart Account already Deployed) :-")

    const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
        account: kernelAccount,
        calls: [
            createEthTransferCall(),
            createEthTransferCall(),
            createEthTransferCall(),
            createEthTransferCall(),
            createEthTransferCall(),
        ],
    })

    const paymasterGasEstimates = await pimlicoClient.estimateUserOperationGas({
        ...userOp,
    })
    console.log("\nPaymaster Gas Estimates :-")
    console.log("  PreVerificationGas: ", paymasterGasEstimates.preVerificationGas)
    console.log("  VerificationGasLimit: ", paymasterGasEstimates.verificationGasLimit)
    console.log("  CallGasLimit: ", paymasterGasEstimates.callGasLimit)

    userOp.signature = await kernelAccount.signUserOperation({
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

    console.log("\nUserOp via Bundler Receipt :-")
    console.log("  ActualGasUsed: ", receipt.actualGasUsed)
    console.log("  Txn.gasUsed: ", receipt.receipt.gasUsed)
    const bundlerOverhead = receipt.actualGasUsed - receipt.receipt.gasUsed
    console.log("\nBundler Overhead (Gas Used):", bundlerOverhead)
    const directTxnGas = await sendDirectTransactions(5)
    console.log("\nDirect Transaction Gas:", directTxnGas)
    const extraCostOfUsingUserOp = receipt.actualGasUsed - directTxnGas
    console.log("Extra Cost of Using a UserOp vs Direct Transaction (Gas):", extraCostOfUsingUserOp)
    console.log("\n------------------------------------------------\n")

    return {
        scenario: "Single UserOp",
        directTxnGas,
        actualGasUsed: receipt.actualGasUsed,
        txnGasUsed: receipt.receipt.gasUsed,
        bundlerOverhead,
        extraCost: extraCostOfUsingUserOp,
        numberOfUserOps: 1,
    }
}

async function batchedUserOperationsGasResult() {
    console.log(
        "Sending multiple UserOps from unique senders (userOps involve deployment of Smart Contract Account) :-",
    )

    const privateKey1 = generatePrivateKey()
    const privateKey2 = generatePrivateKey()
    const privateKey3 = generatePrivateKey()
    const privateKey4 = generatePrivateKey()
    const privateKey5 = generatePrivateKey()

    const account1 = privateKeyToAccount(privateKey1)
    const account2 = privateKeyToAccount(privateKey2)
    const account3 = privateKeyToAccount(privateKey3)
    const account4 = privateKeyToAccount(privateKey4)
    const account5 = privateKeyToAccount(privateKey5)

    const walletClient1 = createWalletClient({
        account: account1,
        chain: localhost,
        transport: http(rpcURL),
    })

    const walletClient2 = createWalletClient({
        account: account2,
        chain: localhost,
        transport: http(rpcURL),
    })

    const walletClient3 = createWalletClient({
        account: account3,
        chain: localhost,
        transport: http(rpcURL),
    })

    const walletClient4 = createWalletClient({
        account: account4,
        chain: localhost,
        transport: http(rpcURL),
    })

    const walletClient5 = createWalletClient({
        account: account5,
        chain: localhost,
        transport: http(rpcURL),
    })

    const kernelAccount1: SmartAccount = await getKernelAccount(walletClient1, account1)
    const kernelAddress1 = await kernelAccount1.getAddress()
    const kernelClient1 = getKernelClient(kernelAccount1)

    const kernelAccount2: SmartAccount = await getKernelAccount(walletClient2, account2)
    const kernelAddress2 = await kernelAccount2.getAddress()
    const kernelClient2 = getKernelClient(kernelAccount2)

    const kernelAccount3: SmartAccount = await getKernelAccount(walletClient3, account3)
    const kernelAddress3 = await kernelAccount3.getAddress()
    const kernelClient3 = getKernelClient(kernelAccount3)

    const kernelAccount4: SmartAccount = await getKernelAccount(walletClient4, account4)
    const kernelAddress4 = await kernelAccount4.getAddress()
    const kernelClient4 = getKernelClient(kernelAccount4)

    const kernelAccount5: SmartAccount = await getKernelAccount(walletClient5, account5)
    const kernelAddress5 = await kernelAccount5.getAddress()
    const kernelClient5 = getKernelClient(kernelAccount5)

    const prefundRes1 = await fund_smart_account(kernelAddress1)
    if (prefundRes1 !== "success") {
        throw new Error("Funding SmartAccount 1 failed")
    }

    const prefundRes2 = await fund_smart_account(kernelAddress2)
    if (prefundRes2 !== "success") {
        throw new Error("Funding SmartAccount 2 failed")
    }

    const prefundRes3 = await fund_smart_account(kernelAddress3)
    if (prefundRes3 !== "success") {
        throw new Error("Funding SmartAccount 3 failed")
    }

    const prefundRes4 = await fund_smart_account(kernelAddress4)
    if (prefundRes4 !== "success") {
        throw new Error("Funding SmartAccount 4 failed")
    }

    const prefundRes5 = await fund_smart_account(kernelAddress5)
    if (prefundRes5 !== "success") {
        throw new Error("Funding SmartAccount 5 failed")
    }

    const userOp1 = kernelClient1.sendUserOperation({
        account: kernelAccount1,
        calls: [createEthTransferCall()],
    })

    const userOp2 = kernelClient2.sendUserOperation({
        account: kernelAccount2,
        calls: [createEthTransferCall()],
    })

    const userOp3 = kernelClient3.sendUserOperation({
        account: kernelAccount3,
        calls: [createEthTransferCall()],
    })

    const userOp4 = kernelClient4.sendUserOperation({
        account: kernelAccount4,
        calls: [createEthTransferCall()],
    })

    const userOp5 = kernelClient5.sendUserOperation({
        account: kernelAccount5,
        calls: [createEthTransferCall()],
    })

    const hashes = await Promise.all([userOp1, userOp2, userOp3, userOp4, userOp5])

    const r1 = kernelClient1.waitForUserOperationReceipt({
        hash: hashes[0],
    })
    const r2 = kernelClient2.waitForUserOperationReceipt({
        hash: hashes[1],
    })
    const r3 = kernelClient3.waitForUserOperationReceipt({
        hash: hashes[2],
    })
    const r4 = kernelClient4.waitForUserOperationReceipt({
        hash: hashes[3],
    })
    const r5 = kernelClient5.waitForUserOperationReceipt({
        hash: hashes[4],
    })

    const receipts = await Promise.all([r1, r2, r3, r4, r5])

    const txn0Count = receipts.filter((receipt) => receipt.receipt.transactionIndex === 0).length
    const txn1Count = receipts.filter((receipt) => receipt.receipt.transactionIndex === 1).length

    const receipts1 =
        txn0Count >= txn1Count
            ? receipts.filter((receipt) => receipt.receipt.transactionIndex === 0)
            : receipts.filter((receipt) => receipt.receipt.transactionIndex === 1)

    console.log(`Bundle with ${receipts1.length} UserOps :-`)
    console.log("  Block: ", receipts1[0].receipt.blockNumber)
    console.log("  Txn Index: ", receipts1[0].receipt.transactionIndex)
    console.log("  Actual Gas Used for each UserOp:")
    receipts1.forEach((receipt, index) => {
        console.log(`    UserOp${index + 1}: `, receipt.actualGasUsed)
    })

    const totalActualGas = receipts1.reduce((acc, receipt) => acc + receipt.actualGasUsed, BigInt(0))
    console.log("  Total ActualGas Used: ", totalActualGas)
    console.log("  Txn.gasUsed (Total for the bundle): ", receipts1[0].receipt.gasUsed)
    console.log("\nBundler Overhead: ", totalActualGas - receipts1[0].receipt.gasUsed)
    const directTxnGas = await sendDirectTransactions(receipts1.length)
    console.log("Direct Transaction Gas: ", directTxnGas)
    console.log("Extra Cost of Using a UserOp vs Direct Transaction (Gas): ", totalActualGas - directTxnGas)
    console.log("\n------------------------------------------------\n")

    const u1 = kernelClient1.sendUserOperation({
        account: kernelAccount1,
        calls: [createEthTransferCall()],
    })

    const u2 = kernelClient2.sendUserOperation({
        account: kernelAccount2,
        calls: [createEthTransferCall()],
    })

    const u3 = kernelClient3.sendUserOperation({
        account: kernelAccount3,
        calls: [createEthTransferCall()],
    })

    const u4 = kernelClient4.sendUserOperation({
        account: kernelAccount4,
        calls: [createEthTransferCall()],
    })

    const u5 = kernelClient5.sendUserOperation({
        account: kernelAccount5,
        calls: [createEthTransferCall()],
    })

    const uHashes = await Promise.all([u1, u2, u3, u4, u5])

    const r01 = kernelClient1.waitForUserOperationReceipt({
        hash: uHashes[0],
    })
    const r02 = kernelClient2.waitForUserOperationReceipt({
        hash: uHashes[1],
    })
    const r03 = kernelClient3.waitForUserOperationReceipt({
        hash: uHashes[2],
    })
    const r04 = kernelClient4.waitForUserOperationReceipt({
        hash: uHashes[3],
    })
    const r05 = kernelClient5.waitForUserOperationReceipt({
        hash: uHashes[4],
    })

    const rcpts = await Promise.all([r01, r02, r03, r04, r05])
    const txn0Cnt = rcpts.filter((receipt) => receipt.receipt.transactionIndex === 0).length
    const txn1Cnt = rcpts.filter((receipt) => receipt.receipt.transactionIndex === 1).length

    const receipts2 =
        txn0Cnt >= txn1Cnt
            ? rcpts.filter((receipt) => receipt.receipt.transactionIndex === 0)
            : rcpts.filter((receipt) => receipt.receipt.transactionIndex === 1)

    console.log("Gas Usage on UserOps when Smart Account are already deployed :-\n")
    console.log(`Bundle with ${receipts2.length} UserOps :-`)
    console.log("  Block: ", receipts2[0].receipt.blockNumber)
    console.log("  Txn Index: ", receipts2[0].receipt.transactionIndex)
    console.log("  Actual Gas Used for each UserOp:")
    receipts2.forEach((receipt, index) => {
        console.log(`    UserOp${index + 1}: `, receipt.actualGasUsed)
    })

    const totalActualGasUsed = receipts2.reduce((acc, receipt) => acc + receipt.actualGasUsed, BigInt(0))
    console.log("  Total ActualGas Used: ", totalActualGasUsed)
    console.log("  Txn.gasUsed (Total for the bundle): ", receipts2[0].receipt.gasUsed)
    console.log("\nBundler Overhead: ", totalActualGasUsed - receipts2[0].receipt.gasUsed)
    const directTxnGasUsed = await sendDirectTransactions(receipts2.length)
    console.log("Direct Transaction Gas: ", directTxnGasUsed)
    console.log("Extra Cost of Using a UserOp vs Direct Transaction (Gas): ", totalActualGasUsed - directTxnGasUsed)
    console.log("\n------------------------------------------------\n")

    const multipleUserOpsDeploymentResults = {
        scenario: "Multiple UserOps with Deployment",
        directTxnGas,
        actualGasUsed: totalActualGas,
        txnGasUsed: receipts1[0].receipt.gasUsed,
        bundlerOverhead: totalActualGas - receipts1[0].receipt.gasUsed,
        extraCost: totalActualGas - directTxnGas,
        numberOfUserOps: receipts1.length,
    }

    const multipleUserOpsNoDeploymentResults = {
        scenario: "Multiple UserOps without Deployment",
        directTxnGas: directTxnGasUsed,
        actualGasUsed: totalActualGasUsed,
        txnGasUsed: receipts2[0].receipt.gasUsed,
        bundlerOverhead: totalActualGasUsed - receipts2[0].receipt.gasUsed,
        extraCost: totalActualGasUsed - directTxnGasUsed,
        numberOfUserOps: receipts2.length,
    }

    return { multipleUserOpsDeploymentResults, multipleUserOpsNoDeploymentResults }
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

    console.log("\nGas Fields Explained:")
    console.log("- DirectTxnGas: Gas cost for a normal transaction, used as a baseline for comparison.")
    console.log(
        "- actualGasUsed: Total gas used by the entire user operation, including bundler and EntryPoint processing.",
    )
    console.log("- receipt.gasUsed: Gas used by the transaction with the UserOps Bundle from bundler to EntryPoint.")
    console.log(
        "- Bundler Overhead: Difference between actualGasUsed and receipt.gasUsed, representing extra cost of the bundler.",
    )

    console.log("\nPaymaster Gas Fields:")
    console.log("- PreVerificationGas: Gas used before validating the userOp (e.g., signature checks).")
    console.log("- VerificationGasLimit: Gas limit for full validation of the userOp.")
    console.log("- CallGasLimit: Gas allocated for executing the actual userOp (e.g., transfers or contract calls).")
    console.log("\n------------------------------------------------\n")

    type GasResult = {
        scenario: string
        directTxnGas: bigint
        actualGasUsed: bigint
        txnGasUsed: bigint
        bundlerOverhead: bigint
        extraCost: bigint
        numberOfUserOps: number
    }

    let singleOpResults: GasResult | undefined
    try {
        singleOpResults = await singleUserOperationGasResult(kernelAccount, kernelClient)
    } catch (error) {
        console.error("Single UserOp: ", error)
    }

    let batchedCallsResults: GasResult | undefined
    try {
        batchedCallsResults = await batchedCallsGasResult(kernelAccount, kernelClient)
    } catch (error) {
        console.error("Batched CallData: ", error)
    }

    let multipleUserOpsDeploymentResults: GasResult | undefined
    let multipleUserOpsNoDeploymentResults: GasResult | undefined
    try {
        const results = await batchedUserOperationsGasResult()
        multipleUserOpsDeploymentResults = results.multipleUserOpsDeploymentResults
        multipleUserOpsNoDeploymentResults = results.multipleUserOpsNoDeploymentResults
    } catch (error) {
        console.error("Batched UserOps: ", error)
    }

    const gasUsageResults = [
        singleOpResults,
        batchedCallsResults,
        multipleUserOpsDeploymentResults,
        multipleUserOpsNoDeploymentResults,
    ].filter((result): result is GasResult => result !== undefined)

    console.log("Gas Usage Results Comparison Table :-\n")
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
