import { http, type Hex, createPublicClient, createWalletClient, formatEther, parseEther } from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"

const privateKey = process.env.PRIVATE_KEY_LOCAL as Hex
const bundlerRpc = process.env.BUNDLER_URL_LOCAL
const rpcURL = process.env.RPC_URL_LOCAL

if (!privateKey || !bundlerRpc || !rpcURL) {
    throw new Error("Please provide PRIVATE_KEY_LOCAL, BUNDLER_URL_LOCAL and RPC_URL_LOCAL in .env file")
}

type Deployments = {
    ECDSAValidator: string
    Kernel: string
    KernelFactory: string
    FactoryStaker: string
}

import deploymentsJson from "../out/deployment.json"
const deployments: Deployments = deploymentsJson

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
            : "0xE02886AC084a81b114DC4bc9b6c655A1D8c297be",
        accountLogicAddress: deployments.Kernel
            ? (deployments.Kernel as Hex)
            : "0x59Fc1E09E3Ea0dAE02DBe628AcAa84aA9B937737",
        factoryAddress: deployments.KernelFactory
            ? (deployments.KernelFactory as Hex)
            : "0x80D747087e1d2285CcE1a308fcc445C12A751dc6",
        metaFactoryAddress: deployments.FactoryStaker
            ? (deployments.FactoryStaker as Hex)
            : "0x58eEa36eDd475f353D7743d21a56769931d8AD0D",
    })
}

function getKernelClient(kernelAccount: SmartAccount): SmartAccountClient {
    return createSmartAccountClient({
        account: kernelAccount,
        chain: localhost,
        bundlerTransport: http(bundlerRpc, {
            timeout: 30_000, // Custom timeout, increased to avoid timeout error when bundling
        }),
        userOperation: {
            estimateFeesPerGas: async () => {
                return (await pimlicoClient.getUserOperationGasPrice()).fast
            },
        },
    })
}

async function prefund_smart_account(kernelAccount: SmartAccount): Promise<string> {
    const accountAddress = await kernelAccount.getAddress()

    try {
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
    } catch (error) {
        console.error(error)
        process.exit(1)
    }

    return "success"
}

export function getRandomAccount(): Hex {
    return privateKeyToAddress(generatePrivateKey()).toString() as Hex
}

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount()

    const receiverAddress = getRandomAccount()
    const AMOUNT = "0.001"

    const res = await prefund_smart_account(kernelAccount)
    if (res !== "success") {
        console.log("Smart Account prefund failed")
        process.exit(1)
    }

    const kernelClient = getKernelClient(kernelAccount)

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
        console.log("Balance is correct", balanceAsEther, "ETH")
    } else {
        console.error("Balance is not correct", balanceAsEther, "ETH")
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
