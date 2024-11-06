import type { Address, Hex, PrivateKeyAccount, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient, formatEther, numberToHex, parseEther } from "viem"
import type {
    GetPaymasterDataParameters,
    GetPaymasterStubDataParameters,
    SmartAccount,
    UserOperation,
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
                const startTime = Date.now();
                const timings = {
                    rpcRequestStart: 0,
                    rpcRequestDuration: 0,
                    totalTime: 0,
                };

                // Start timing for the RPC call
                timings.rpcRequestStart = Date.now() - startTime;
                const rpcRequestStartTime = Date.now();
                const gasEstimates = await pimlicoClient.estimateUserOperationGas({
                    ...parameters,
                    paymaster: paymasterAddress,
                });
                timings.rpcRequestDuration = Date.now() - rpcRequestStartTime;

                // Calculate total function time
                timings.totalTime = Date.now() - startTime;

                console.log("getPaymasterData Benchmark Results:", {
                    "RPC Request Start (ms)": timings.rpcRequestStart,
                    "RPC Request Duration (ms)": timings.rpcRequestDuration,
                    "Total Function Time (ms)": timings.totalTime,
                });

                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x", // Only required for extra context, no need to encode paymaster gas values manually
                    paymasterVerificationGasLimit: gasEstimates.paymasterVerificationGasLimit ?? 0n,
                    paymasterPostOpGasLimit: gasEstimates.paymasterPostOpGasLimit ?? 0n,
                };
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

async function testRootValidator(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    const receiverAddress = getRandomAccount();

    // Initialize benchmarking timings
    const startTime = Date.now();
    const timings = {
        start: startTime,
        sendTransactionStart: 0,
        sendTransactionEnd: 0,
        waitForReceiptStart: 0,
        waitForReceiptEnd: 0,
        checkBalanceStart: 0,
        checkBalanceEnd: 0,
        totalTime: 0,
    };

    console.log("Root Validator: Sending UserOP");
    timings.sendTransactionStart = Date.now();
    const txHash = await kernelClient.sendTransaction({
        account: kernelAccount,
        to: receiverAddress,
        chain: localhost,
        value: parseEther(AMOUNT),
    });
    timings.sendTransactionEnd = Date.now();

    console.log("Root Validator: Waiting for userOp receipt");
    timings.waitForReceiptStart = Date.now();
    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    });
    timings.waitForReceiptEnd = Date.now();

    // Check if the transaction was successful
    if (receipt.status !== "success") {
        throw new Error("KernelClient transaction failed");
    }

    console.log("receipt:", receipt)

    // Check balance and benchmark this step as well
    timings.checkBalanceStart = Date.now();
    const balance = await checkBalance(receiverAddress);
    timings.checkBalanceEnd = Date.now();

    if (balance === AMOUNT) {
        console.log(`Using RootValidator: Balance is correct: ${balance} ETH`);
    } else {
        throw new Error(`Using RootValidator: Balance is not correct: ${balance} ETH`);
    }

    // Calculate total time taken
    timings.totalTime = Date.now() - startTime;

    // Generate a readable gas report
    const gasReport = {
        "Transaction Hash": txHash,
        "Timings (ms)": {
            "Send Transaction": timings.sendTransactionEnd - timings.sendTransactionStart,
            "Wait for Receipt": timings.waitForReceiptEnd - timings.waitForReceiptStart,
            "Check Balance": timings.checkBalanceEnd - timings.checkBalanceStart,
            "Total Time": timings.totalTime,
        },
        "Gas Used": receipt.gasUsed?.toString() ?? "N/A",
        "Final Balance": balance,
    };

    console.log("Root Validator Gas Report:", JSON.stringify(gasReport, null, 2));
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

    // try {
    //     await testCustomValidator(kernelAccount, kernelClient, kernelAddress)
    // } catch (error) {
    //     console.error("Custom Validator: ", error)
    // }
}

main().then(() => {
    process.exit(0)
})
