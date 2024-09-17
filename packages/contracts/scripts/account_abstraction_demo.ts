import { type Abi, type Address, type Hex, formatEther } from "viem"
import { http, createPublicClient, createWalletClient, numberToHex, parseEther } from "viem"
import type { GetPaymasterDataParameters, GetPaymasterStubDataParameters, SmartAccount } from "viem/account-abstraction"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"

import abisJson from "../out/abis.json" assert { type: "json" }
import deploymentsJson from "../out/deployment.json" assert { type: "json" }

type ContractAlias = keyof typeof deploymentsJson
type Deployments = { [key in ContractAlias]: Address }
type Abis = { [key in keyof typeof abisJson]: Abi }

const deployments = deploymentsJson as Deployments
const abis = {} as Abis

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

async function getKernelAccount(): Promise<SmartAccount> {
    return toEcdsaKernelSmartAccount({
        client: walletClient,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        owners: [account],
        version: "0.3.1",
        ecdsaValidatorAddress: deployments.ECDSAValidator,
        accountLogicAddress: deployments.Kernel,
        factoryAddress: deployments.KernelFactory,
        metaFactoryAddress: deployments.FactoryStaker,
    })
}

function getKernelClient(kernelAccount: SmartAccount): SmartAccountClient {
    const paymasterAddress = deployments.HappyPaymaster

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
                    paymasterVerificationGasLimit: 50_000n, // Same value as found in the docs, not a random number
                    paymasterPostOpGasLimit: 20_000n, // Same value as found in the docs, serves as a placeholder
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

async function deposit_paymaster(): Promise<string> {
    try {
        const txHash = await walletClient.writeContract({
            address: entryPoint07Address,
            abi: abis.IEntryPoint,
            functionName: "depositTo",
            args: [deployments.HappyPaymaster],
            value: parseEther("10"),
        })

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
        })

        return receipt.status
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

export function getRandomAccount() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Hex
}

const AMOUNT = "0.001"

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount()
    const kernelClient = getKernelClient(kernelAccount)

    const receiverAddress = getRandomAccount()

    const res = await deposit_paymaster()
    if (res !== "success") {
        console.error("Deposit failed")
        process.exit(1)
    }

    try {
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
            console.log("KernelClient transaction failed")
            process.exit(1)
        }
    } catch (error) {
        console.error(error)
    }

    const balance = await publicClient.getBalance({
        address: receiverAddress,
        blockTag: "latest",
    })

    const balanceAsEther = formatEther(balance)

    if (balanceAsEther === AMOUNT) {
        console.log("Balance is correct:", balanceAsEther, "ETH")
    } else {
        console.error("Balance is not correct:", balanceAsEther, "ETH")
    }
}

main()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
