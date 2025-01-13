import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { http, type Address, createPublicClient, createWalletClient, custom } from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"
import { getCurrentChain } from "./chains"
import { walletClientAtom } from "./walletClient"
import { getWalletClient } from "#src/state/walletClient"
import { happyConnector } from "#src/wagmi/connector.ts"
import { connect, disconnect } from "@wagmi/core"
import { config } from "#src/wagmi/config.ts"
import { providerAtom } from "./provider"
import {iframeProvider} from "#src/wagmi/provider"
import { getTransport} from "#src/state/transport"
import { getSmartAccountClient } from "./smartAccountClient"


export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">

export async function createKernelAccount(walletAddress: Address): Promise<KernelSmartAccount | undefined> {
    const chain = getCurrentChain()
    const currentChain = convertToViemChain(chain)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const clientOptions = {
        transport: http(currentChain.rpcUrls[0]),
        chain: currentChain,
    }
    console.log("createKernelAcocount called with ", walletAddress)
    
    const smartAccountClient = await getSmartAccountClient()
    console.log("smartAccountClient:", smartAccountClient)

    const walletClientWithHappyProvider = createWalletClient({
        account: walletAddress,
        chain: currentChain,
        transport: custom(iframeProvider)
    })

    console.log("walletClientWithHappyProvider:", walletClientWithHappyProvider)

    try {
        // We can't use `publicClientAtom` and need to recreate a public client since :
        // 1. `publicClientAtom` uses `transportAtom` for its `transport` value, which can be either `custom()` or `http()`
        // 2. `toKernelSmartAccount()` expects a simple client with direct RPC access
        const publicClient = createPublicClient(clientOptions)
        
        let owner: any = getWalletClient()
        // console.log("kernalAccount owner:", owner)  
        if(!owner){
            console.log("Owner is undefined", walletAddress)
            owner = createWalletClient({
                ...clientOptions,
                account: walletAddress,
            })
            console.log("Owner:", owner)
        }

        // original flow
        // const owner = createWalletClient({
        //     ...clientOptions,
        //     account: walletAddress,
        // })

        return await toEcdsaKernelSmartAccount({
            client: publicClient,
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7",
            },
            owners: [owner!], 
            version: "0.3.1",
            ecdsaValidatorAddress: contracts.ECDSAValidator,
            accountLogicAddress: contracts.Kernel,
            factoryAddress: contracts.KernelFactory,
            metaFactoryAddress: contracts.FactoryStaker,
        })
    } catch (error) {
        console.error("Kernel account could not be created:", error)
        return undefined
    }
}

export const kernelAccountAtom: Atom<Promise<KernelSmartAccount | undefined>> = atom(async (get) => {
    const wallet = get(walletClientAtom)
    if (!wallet?.account) return undefined
    return await createKernelAccount(wallet.account.address)
})

export const { getValue: getKernelAccount } = accessorsFromAtom(kernelAccountAtom)
