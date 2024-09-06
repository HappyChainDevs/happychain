import { config } from "dotenv"
config()

import {
    http,
    type Hex,
    createClient,
    createPublicClient,
    createWalletClient,
    defineChain,
    formatEther,
    parseEther,
} from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"

const privateKey = process.env.PRIVATE_KEY_LOCAL
const bundlerRpc = process.env.BUNDLER_URL_LOCAL
const rpcURL = process.env.RPC_URL_LOCAL

if (!privateKey || !bundlerRpc || !rpcURL) {
    throw new Error("Please provide PRIVATE_KEY_LOCAL, BUNDLER_URL_LOCAL and RPC_URL_LOCAL in .env file")
}

const chain = defineChain({
    id: 1_337,
    name: "Anvil",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: ["http://127.0.0.1:8545"],
            webSocket: ["ws://127.0.0.1:8545"],
        },
    },
})

const normalizedPrivateKey: Hex = privateKey.startsWith("0x") ? (privateKey as Hex) : (`0x${privateKey}` as Hex)
const account = privateKeyToAccount(normalizedPrivateKey)

const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcURL),
})

const client = createClient({
    account,
    chain,
    transport: http(rpcURL),
})

const publicClient = createPublicClient({
    chain,
    transport: http(rpcURL),
})

const pimlicoClient = createPimlicoClient({
    chain,
    transport: http(bundlerRpc),
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
    },
})

async function getKernelAccount(): Promise<SmartAccount> {
    return await toEcdsaKernelSmartAccount({
        client,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        owners: [account],
        version: "0.3.1",
        ecdsaValidatorAddress: "0x2cA67e9cF717c3A210574AA1fcDB38C0bE7b6b63",
        accountLogicAddress: "0x15A1C1a83810984D0d9c26386171878ADa04D034",
        factoryAddress: "0x560cbC094b16fe929Cf889Ffa59B42e7BB0b86Fa",
        metaFactoryAddress: "0xF2F43D2eA39c24EeC8Ff985B192935C50e976E4c",
    })
}

function getKernelClient(kernelAccount: SmartAccount): SmartAccountClient {
    return createSmartAccountClient({
        account: kernelAccount,
        chain: chain,
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
    console.log("Funding kernel account address = ", accountAddress)

    try {
        const txHash = await walletClient.sendTransaction({
            account: account,
            to: accountAddress,
            chain,
            kzg: undefined,
            value: parseEther("0.1"),
        })

        console.log(`Prefund transaction hash: ${txHash}`)

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
        })

        return receipt.status
    } catch (error) {
        console.error("Error receiving transaction receipt:", error)
    }

    return "success"
}

export function getRandomAccount(): Hex {
    const privateKey = generatePrivateKey()
    return privateKeyToAddress(privateKey).toString() as Hex
}

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount()

    const receiverAddress = getRandomAccount()
    const AMOUNT = "0.001"

    console.log("Receiver address = ", receiverAddress)

    const res = await prefund_smart_account(kernelAccount)
    if (res === "success") {
        console.log("Transaction was successful")
    } else {
        console.error("Transaction failed")
    }

    const kernelClient = getKernelClient(kernelAccount)

    try {
        const txHash = await kernelClient.sendTransaction({
            account: kernelAccount,
            to: receiverAddress,
            chain,
            kzg: undefined,
            value: parseEther(AMOUNT),
        })

        console.log(`Transaction hash: ${txHash}`)

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
        })

        if (receipt.status === "success") {
            console.log("Transaction was successful")
        } else {
            console.log("Transaction failed")
        }
    } catch (error) {
        console.error("Error receiving transaction receipt:", error)
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
        console.log("Demo Successful.")
        process.exit(0) // Explicitly exit with success code
    })
    .catch((error) => {
        console.error(error)
        process.exit(1) // Exit with failure code
    })
