import type { PrivateKeyAccount, PublicClient } from "viem"
import { http, createPublicClient } from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { localhost } from "viem/chains"

import { type SmartAccountClient, createSmartAccountClient } from "permissionless"
import { toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { type Erc7579Actions, erc7579Actions } from "permissionless/actions/erc7579"

import { pimlicoClient, publicClient } from "./clients"
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
        bundlerTransport: http(bundlerRpc, {
            timeout: 30_000,
        }),
        paymaster: {
            async getPaymasterData(parameters) {
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
            async getPaymasterStubData(_parameters) {
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

async function generatePrefundedKernelAccounts(count: number): Promise<
    {
        kernelAccount: SmartAccount
        kernelClient: SmartAccountClient
    }[]
> {
    const accounts = []
    for (let i = 0; i < count; i++) {
        const { kernelAccount, kernelClient } = await generatePrefundedKernelAccount()
        accounts.push({ kernelAccount, kernelClient })
    }

    return accounts
}

async function generatePrefundedKernelAccount(): Promise<{
    kernelAccount: SmartAccount
    kernelClient: SmartAccountClient
}> {
    const account = privateKeyToAccount(generatePrivateKey())

    const publicClient = createPublicClient({
        chain: localhost,
        transport: http(rpcURL),
    })

    const kernelAccount: SmartAccount = await getKernelAccount(publicClient, account)
    const kernelAddress = await kernelAccount.getAddress()
    const kernelClient = getKernelClient(kernelAccount)

    const prefundRes = await fundSmartAccount(kernelAddress)
    if (prefundRes !== "success") {
        throw new Error("Funding SmartAccount 1 failed")
    }

    return { kernelAccount, kernelClient }
}

export { getKernelAccount, getKernelClient, generatePrefundedKernelAccount, generatePrefundedKernelAccounts }
