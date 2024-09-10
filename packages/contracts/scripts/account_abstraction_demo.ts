import { http, type Hex, createPublicClient, createWalletClient, formatEther, parseEther } from "viem"
import type { GetPaymasterDataParameters, GetPaymasterStubDataParameters, SmartAccount } from "viem/account-abstraction"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"

import abisJson from "../deployments/LOCAL/abis.json"
import deploymentsJson from "../deployments/LOCAL/deployment.json"

const privateKey = process.env.PRIVATE_KEY_LOCAL as Hex
const bundlerRpc = process.env.BUNDLER_LOCAL
const rpcURL = process.env.RPC_LOCAL

if (!privateKey || !bundlerRpc || !rpcURL) {
    throw new Error("Please provide PRIVATE_KEY_LOCAL, BUNDLER_URL_LOCAL and RPC_URL_LOCAL in .env file")
}

type Deployments = {
    ECDSAValidator: string
    Kernel: string
    KernelFactory: string
    FactoryStaker: string
    ERC20Mock: string
    SigningPaymaster: string
}

type Abis = {
    ERC20Mock: unknown[]
}

const deployments: Deployments = deploymentsJson
const abis: Abis = abisJson

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

async function getKernelAccount(): Promise<SmartAccount> {
    return toEcdsaKernelSmartAccount({
        client: walletClient,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        owners: [account],
        version: "0.3.1",
        ecdsaValidatorAddress: deployments.ECDSAValidator
            ? (deployments.ECDSAValidator as Hex)
            : "0x9133Cc1CEa0E85bC0D1a797EBe31C599967C7bEC",
        accountLogicAddress: deployments.Kernel
            ? (deployments.Kernel as Hex)
            : "0xB98772a89eC8B26E499D3A4571780aEcC34303Dc",
        factoryAddress: deployments.KernelFactory
            ? (deployments.KernelFactory as Hex)
            : "0x4FF5f18D402C82e900A6403a2C7b4dCF5F7B49BE",
        metaFactoryAddress: deployments.FactoryStaker
            ? (deployments.FactoryStaker as Hex)
            : "0x26d9BA57a14364e8e55C8d85Bd135aB1650d0Adc",
    })
}

function getKernelClient(kernelAccount: SmartAccount): SmartAccountClient {
    const paymasterAddress = deployments.SigningPaymaster
        ? (deployments.SigningPaymaster as Hex)
        : "0x1E92435c8B86b1d9DC4b1A340c2C42b29a5A1B00"

    return createSmartAccountClient({
        account: kernelAccount,
        chain: localhost,
        bundlerTransport: http(bundlerRpc, {
            timeout: 30_000,
        }),
        paymaster: {
            async getPaymasterData(parameters: GetPaymasterDataParameters) {
                const gasEstimates = (await pimlicoClient.estimateUserOperationGas({
                    ...parameters,
                    paymaster: paymasterAddress,
                })) as {
                    preVerificationGas: bigint
                    verificationGasLimit: bigint
                    callGasLimit: bigint
                    paymasterVerificationGasLimit?: bigint
                    paymasterPostOpGasLimit?: bigint
                }

                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x",
                    paymasterPostOpGasLimit: gasEstimates.paymasterPostOpGasLimit ?? 0n,
                    paymasterVerificationGasLimit: gasEstimates.paymasterVerificationGasLimit ?? 0n,
                }
            },

            async getPaymasterStubData(_parameters: GetPaymasterStubDataParameters) {
                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x",
                    paymasterVerificationGasLimit: 50_000n,
                    paymasterPostOpGasLimit: 20_000n,
                }
            },
        },
        userOperation: {
            estimateFeesPerGas: async () => {
                return (await pimlicoClient.getUserOperationGasPrice()).fast
            },
        },
    })
}

export function getRandomAccount(): Hex {
    return privateKeyToAddress(generatePrivateKey()).toString() as Hex
}

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount()
    const kernelClient = getKernelClient(kernelAccount)

    const tokenAddress = deployments.ERC20Mock
        ? (deployments.ERC20Mock as Hex)
        : "0xa55F9759439db37ccFeBcb7064B5f574db53aB0b"
    const receiverAddress = getRandomAccount()
    const AMOUNT = "1000"

    try {
        const txHash = await kernelClient.writeContract({
            address: tokenAddress,
            abi: abis.ERC20Mock,
            functionName: "mint",
            chain: localhost,
            args: [receiverAddress, AMOUNT],
            account: kernelAccount,
        })

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
        })

        if (receipt.status !== "success") {
            console.log("KernelClient transaction failed")
            process.exit(1)
        }
    } catch (error) {
        console.error(error)
    }

    const balance = (await publicClient.readContract({
        address: tokenAddress,
        abi: abis.ERC20Mock,
        functionName: "balanceOf",
        args: [receiverAddress],
    })) as string

    console.log("Balance is ", balance, "wei")
}

main()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
