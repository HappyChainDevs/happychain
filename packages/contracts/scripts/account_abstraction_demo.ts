import { http, type Hex, createPublicClient, createWalletClient } from "viem"
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
    throw new Error("Missing environment variables")
}

type Deployments = {
    ECDSAValidator: Hex
    Kernel: Hex
    KernelFactory: Hex
    FactoryStaker: Hex
    ERC20Mock: Hex
    SigningPaymaster: Hex
}

type Abis = {
    ERC20Mock: unknown[]
}

const deployments = deploymentsJson as Deployments
const abis = abisJson as Abis

const fallbackDeployments = {
    ECDSAValidator: "0xE02886AC084a81b114DC4bc9b6c655A1D8c297be",
    Kernel: "0x59Fc1E09E3Ea0dAE02DBe628AcAa84aA9B937737",
    KernelFactory: "0x80D747087e1d2285CcE1a308fcc445C12A751dc6",
    FactoryStaker: "0x58eEa36eDd475f353D7743d21a56769931d8AD0D",
    ERC20Mock: "0x",
    SigningPaymaster: "0x",
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

async function getKernelAccount(): Promise<SmartAccount> {
    return toEcdsaKernelSmartAccount({
        client: walletClient,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        owners: [account],
        version: "0.3.1",
        ecdsaValidatorAddress: deployments.ECDSAValidator ?? fallbackDeployments.ECDSAValidator,
        accountLogicAddress: deployments.Kernel ?? fallbackDeployments.Kernel,
        factoryAddress: deployments.KernelFactory ?? fallbackDeployments.KernelFactory,
        metaFactoryAddress: deployments.FactoryStaker ?? fallbackDeployments.FactoryStaker,
    })
}

function getKernelClient(kernelAccount: SmartAccount): SmartAccountClient {
    const paymasterAddress = deployments.SigningPaymaster ?? "0x1E92435c8B86b1d9DC4b1A340c2C42b29a5A1B00"

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
                return await publicClient.estimateFeesPerGas()
            },
        },
    })
}

export function getRandomAccount() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Hex
}

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount()
    const kernelClient = getKernelClient(kernelAccount)

    const tokenAddress = deployments.ERC20Mock ?? "0xa55F9759439db37ccFeBcb7064B5f574db53aB0b"
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

    console.log("Balance is: ", balance, "wei")
}

main()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
