import type {Address, Hex, WalletClient} from "viem"
import { http, createPublicClient, createWalletClient, formatEther, numberToHex, parseEther } from "viem"
import type { GetPaymasterDataParameters, GetPaymasterStubDataParameters, SmartAccount } from "viem/account-abstraction"
import { entryPoint07Address, getUserOperationHash, formatUserOperationRequest } from "viem/account-abstraction"
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

function toHexDigits(number: bigint, size: number): string {
    return numberToHex(number, { size }).slice(2)
}

async function getKernelAccount(client: WalletClient): Promise<SmartAccount> {
    return toEcdsaKernelSmartAccount({
        client: client,
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

                const verificationGasHex = toHexDigits(gasEstimates.paymasterVerificationGasLimit ?? 0n, 16)
                const postOpGasHex = toHexDigits(gasEstimates.paymasterPostOpGasLimit ?? 0n, 16)

                const paymasterData: Hex = `0x${verificationGasHex}${postOpGasHex}`

                return {
                    paymaster: paymasterAddress,
                    paymasterData,
                    paymasterPostOpGasLimit: gasEstimates.paymasterPostOpGasLimit ?? 0n,
                    paymasterVerificationGasLimit: gasEstimates.paymasterVerificationGasLimit ?? 0n,
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

const sessionKey = generatePrivateKey()
const sessionAccount = privateKeyToAccount(sessionKey)
const sessionWallet = createWalletClient({
    account: sessionAccount,
    chain: localhost,
    transport: http(rpcURL),
})

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

const NO_HOOKS_ADDRESS = "0x0000000000000000000000000000000000000001"
const SELECTOR = "0xe9ae5c53"
const AMOUNT = "0.01"

async function installCustomModule(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
) {
    const opHash = await kernelClient.installModule({
        type: "validator",
        address: deployment.SessionKeyValidator,

        context: getInitData(NO_HOOKS_ADDRESS, sessionAccount.address, "0x", SELECTOR),
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

// function getAccountGasLimits(verificationGasLimit: bigint, callGasLimit: bigint) {
//     return concat([
//         pad(toHex(verificationGasLimit), {size: 16 }),
//         pad(toHex(callGasLimit), { size: 16 })
//     ])
// }
//
// function getGasLimits(maxPriorityFeePerGas: bigint, maxFeePerGas: bigint) {
//     return concat([
//         pad(toHex(maxPriorityFeePerGas), {
//             size: 16
//         }),
//         pad(toHex(maxFeePerGas), { size: 16 })
//     ])
// }

async function testCustomValidator(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
) {
    const receiverAddress = getRandomAccount()
    const kernelAddress = await kernelAccount.getAddress()
    const sessionSigner = await getKernelAccount(sessionWallet)

    await installCustomModule(kernelAccount, kernelClient)

    const customNonce = await getCustomNonce(kernelAccount.client, kernelAddress, deployment.SessionKeyValidator)
    console.log("customNonce:", customNonce)

    const userOp = await kernelClient.prepareUserOperation({
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
    //
    console.log("\nprepareUserOperation:")
    console.log("nonce:", userOp.nonce)
    console.log("calldata:", userOp.callData)
    // @ts-ignore
    console.log("paymasterAndData:", userOp.paymaster, userOp.paymasterData)
    console.log("prepareUserOperation:\n")


    // @ts-ignore
    const paymasterAndData: Hex = `0x${(userOp.paymaster).slice(2)}${(userOp.paymasterData).slice(2)}${(userOp.paymasterData).slice(2)}`

    const customSig = await kernelAccount.signUserOperation({
        sender: userOp.sender,
        nonce: userOp.nonce,
        callData: userOp.callData,
        callGasLimit: userOp.callGasLimit,
        verificationGasLimit: userOp.verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymasterAndData: paymasterAndData,
        chainId: localhost.id,
        signature: "0x",
    })

    // console.log("Hashing this UserOp: \n")
    // console.log("sender: ", userOp.sender)
    // console.log("nonce: ", userOp.nonce)
    // // @ts-ignore
    // console.log("initCode: ", userOp.initCode)
    // console.log("callData: ", userOp.callData);
    // console.log("callGasLimit: ", userOp.callGasLimit);
    // console.log("verificationGasLimit: ", userOp.verificationGasLimit);
    // console.log("preVerificationGas: ", userOp.preVerificationGas);
    // console.log("maxFeePerGas: ", userOp.maxFeePerGas);
    // console.log("maxPriorityFeePerGas: ", userOp.maxPriorityFeePerGas);
    // console.log("paymasterAndData: ", paymasterAndData);

    const hash = getUserOperationHash({
        userOperation: {
            sender: userOp.sender,
            nonce: userOp.nonce,
            callData: userOp.callData,
            callGasLimit: userOp.callGasLimit,
            verificationGasLimit: userOp.verificationGasLimit,
            preVerificationGas: userOp.preVerificationGas,
            maxFeePerGas: userOp.maxFeePerGas,
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
            // @ts-ignore
            paymasterAndData: paymasterAndData,
            signature: "0x",
        },
        entryPointAddress: entryPoint07Address,
        entryPointVersion: "0.7",
        chainId: localhost.id,
    });

    console.log("hash:", hash)
    console.log("customSig:", customSig)

    // const userOpHash = await kernelClient.sendUserOperation({
    //     account: sessionSigner,
    //     sender: kernelAddress,
    //     calls: [
    //         {
    //             to: receiverAddress,
    //             value: parseEther(AMOUNT),
    //             data: "0x",
    //         },
    //     ],
    //     nonce: customNonce,
    //     signature: customSig
    // })

    // @ts-ignore
    const rpcParameters = formatUserOperationRequest({
        ...userOp,
        signature: customSig,
    })

    const userOpHash = await kernelAccount.client.request(
        {
            method: 'eth_sendUserOperation',
            params: [
                rpcParameters,
                entryPoint07Address,
            ],
        },
        { retryCount: 0 },
    )

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
    const kernelAccount: SmartAccount = await getKernelAccount(walletClient)
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

    // try {
    //     await testRootValidator(kernelAccount, kernelClient)
    // } catch (error) {
    //     console.error("Root Validator: ", error)
    // }

    try {
        await testCustomValidator(kernelAccount, kernelClient)
    } catch (error) {
        console.error("Custom Validator: ", error)
    }
}

main().then(() => {
    process.exit(0)
})
