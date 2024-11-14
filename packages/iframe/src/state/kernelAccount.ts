import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { http, createPublicClient, createWalletClient } from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { ACCOUNT_ABSTRACTION_CONTRACTS } from "#src/constants/accountAbstraction"
import { iframeProvider } from "#src/wagmi/provider"
import { getCurrentChain } from "./chains"
import { walletClientAtom } from "./walletClient"

export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">

export async function createKernelAccount(walletAddress: `0x${string}`): Promise<KernelSmartAccount | undefined> {
    const chain = getCurrentChain()
    const currentChain = convertToViemChain(chain)
    const clientOptions = {
        transport: http(currentChain.rpcUrls[0]),
        chain: currentChain,
    }
    try {
        // We can't use `publicClientAtom` and need to recreate a public client since :
        // 1. `publicClientAtom` uses `transportAtom` for its `transport` value, which can be either `custom()` or `http()`
        // 2. `toEcdsaKernelSmartAccount()` expects a simple client with direct RPC access
        const publicClient = createPublicClient(clientOptions)
        const owner = walletAddress
            ? createWalletClient({
                  ...clientOptions,
                  account: walletAddress,
              })
            : iframeProvider

        const account = await toEcdsaKernelSmartAccount({
            client: publicClient,
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7",
            },
            owners: [owner],
            version: "0.3.1",
            ecdsaValidatorAddress: ACCOUNT_ABSTRACTION_CONTRACTS.ECDSAValidator,
            accountLogicAddress: ACCOUNT_ABSTRACTION_CONTRACTS.Kernel,
            factoryAddress: ACCOUNT_ABSTRACTION_CONTRACTS.KernelFactory,
            metaFactoryAddress: ACCOUNT_ABSTRACTION_CONTRACTS.FactoryStaker,
        })

        console.info("owner address", walletAddress)
        console.info("smart account address", account.address)

        return account
    } catch (error) {
        console.error("Kernel account could not be created:", error)
        return undefined
    }
}

export const kernelAccountAtom: Atom<Promise<KernelSmartAccount | undefined>> = atom(async (get) => {
    const wallet = await get(walletClientAtom)
    if (!wallet?.account) return undefined
    return await createKernelAccount(wallet?.account.address)
})

export const { getValue: getKernelAccount } = accessorsFromAtom(kernelAccountAtom)
