import { type Abi, type Address, type Hex, formatEther } from "viem"
import { http, createPublicClient, createWalletClient, numberToHex, parseEther } from "viem"
import type { GetPaymasterDataParameters, GetPaymasterStubDataParameters, SmartAccount } from "viem/account-abstraction"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"

import { default as abiMapJson } from "../out/abiMap.json" assert { type: "json" }
import { default as abisJson } from "../out/abis.json" assert { type: "json" }
import { default as deploymentsJson } from "../out/deployment.json" assert { type: "json" }

type ContractName = keyof typeof abisJson
type ContractAlias = keyof typeof deploymentsJson
type Abis = { [key in ContractAlias]: Abi }
type Deployments = { [key in ContractAlias]: Address }

const deployments = deploymentsJson as Deployments
const abis = {} as Abis

for (const [alias, contractName] of Object.entries(abiMapJson)) {
    abis[alias as ContractAlias] = abisJson[contractName as ContractName] as Abi
}

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
}

async function fund_smart_account(accountAddress: Address): Promise<string> {
    try {
        const txHash = await walletClient.sendTransaction({
            account: account,
            to: accountAddress,
            chain: localhost,
            value: parseEther(AMOUNT),
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

async function deposit_paymaster(): Promise<string> {
    try {
        const txHash = await walletClient.writeContract({
            address: entryPoint07Address,
            abi: abis.EntryPointV7,
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

const AMOUNT = "0.01"

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount()
    const kernelClient = getKernelClient(kernelAccount)

    const kernelAddress = await kernelAccount.getAddress()
    const receiverAddress = getRandomAccount()

    const prefundRes = await fund_smart_account(kernelAddress)
    if (prefundRes !== "success") {
        console.error("Funding failed")
        process.exit(1)
    }

    const depositRes = await deposit_paymaster()
    if (depositRes !== "success") {
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
