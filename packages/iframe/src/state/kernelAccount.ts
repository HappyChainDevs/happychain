import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { http, type Address, createPublicClient, createWalletClient } from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { getWalletClient } from "#src/state/walletClient"
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"
import { getCurrentChain } from "./chains"
import { getUser } from "./user"
import { walletClientAtom } from "./walletClient"

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

    try {
        // We can't use `publicClientAtom` and need to recreate a public client since :
        // 1. `publicClientAtom` uses `transportAtom` for its `transport` value, which can be either `custom()` or `http()`
        // 2. `toKernelSmartAccount()` expects a simple client with direct RPC access
        const publicClient = createPublicClient(clientOptions)

        const walletClient = getWalletClient()
        // createWalletClient({
        //     ...clientOptions,
        //     account: walletAddress,
        // })

        const owner = {
            async request({ method, params }) {
                console.log({ walletAddress, method, params })
                if (["eth_accounts", "eth_requestAccounts"].includes(method)) {
                    // return ["0x4e9406Feb3abBd470854Fdd00E7809DAf187943d"]
                    // return ["0x7084cfc6d1e1cb911292c0f5e88c9665e8e15979"]
                    return [walletAddress]
                }

                const r = await walletClient?.request({ method, params })
                console.log({ r })
                return r
            },
        }

        return await toEcdsaKernelSmartAccount({
            client: publicClient,
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7",
            },
            owners: [owner as any],
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
