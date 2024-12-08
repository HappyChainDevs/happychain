import type { PrivateKeyAccount, PublicClient } from "viem"
import { http, createPublicClient } from "viem"
import {
    type GetPaymasterDataParameters,
    type GetPaymasterStubDataParameters,
    type SmartAccount,
    entryPoint07Address,
} from "viem/account-abstraction"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { type Erc7579Actions, erc7579Actions } from "permissionless/actions/erc7579"

import { publicClient } from "./clients"
import { bundlerRpc, rpcURL } from "./config"

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { deployment } from "../../deployments/anvil/testing/abis"
import { fundSmartAccount } from "./accounts.ts"

async function getKernelAccount(publicClient: PublicClient, account: PrivateKeyAccount): Promise<SmartAccount> {
    return toEcdsaKernelSmartAccount({
        client: publicClient,
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
        bundlerTransport: http(bundlerRpc),
        paymaster: {
            async getPaymasterData(parameters: GetPaymasterDataParameters) {
                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x", // Only required for extra context, no need to encode paymaster gas values manually
                    paymasterVerificationGasLimit: parameters.factory && parameters.factory !== "0x" ? 45000n : 25000n,
                    paymasterPostOpGasLimit: 1n, // Set to 1 since the postOp function is never called
                }
            },

            // Using stub values from the docs for paymaster-related fields in unsigned user operations for gas estimation.
            async getPaymasterStubData(_parameters: GetPaymasterStubDataParameters) {
                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x",
                    paymasterVerificationGasLimit: 45_000n, // Increased value to account for possible higher gas usage
                    paymasterPostOpGasLimit: 1n,
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

async function generatePrefundedKernelClients(count: number): Promise<SmartAccountClient[]> {
    const kernelClients = []
    for (let i = 0; i < count; i++) {
        const kernelClient = await generatePrefundedKernelClient()
        kernelClients.push(kernelClient)
    }

    return kernelClients
}

async function generatePrefundedKernelClient(): Promise<SmartAccountClient> {
    const account = privateKeyToAccount(generatePrivateKey())

    const publicClient = createPublicClient({
        chain: localhost,
        transport: http(rpcURL),
    })

    const kernelAccount: SmartAccount = await getKernelAccount(publicClient, account)
    const kernelClient = getKernelClient(kernelAccount)

    const prefundRes = await fundSmartAccount(kernelAccount.address!)
    if (prefundRes !== "success") {
        throw new Error("Funding SmartAccount 1 failed")
    }

    return kernelClient
}

export { getKernelAccount, getKernelClient, generatePrefundedKernelClient, generatePrefundedKernelClients }
