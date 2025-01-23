import { accessorsFromAtom } from "@happychain/common"
import { abis } from "@happychain/contracts/account-abstraction/sepolia"
import { WalletType, convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { getSenderAddress } from "permissionless/actions"
import {
    http,
    type Address,
    type EIP1193Parameters,
    type Hex,
    type InvalidInputRpcError,
    type WalletRpcSchema,
    concat,
    concatHex,
    createPublicClient,
    encodeFunctionData,
    toHex,
    zeroAddress,
} from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"
import { getCurrentChain } from "./chains"
import { getInjectedClient } from "./injectedClient"
import { userAtom } from "./user"
import { type AccountWalletClient, getWalletClient, walletClientAtom } from "./walletClient"

export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">

export async function createKernelAccount(
    walletAddress: Address,
    isInjected: boolean,
): Promise<KernelSmartAccount | undefined> {
    const chain = getCurrentChain()
    const currentChain = convertToViemChain(chain)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const clientOptions = {
        transport: http(currentChain.rpcUrls.default.http[0]),
        chain: currentChain,
    }
    try {
        // We can't use `publicClientAtom` and need to recreate a public client since :
        // 1. `publicClientAtom` uses `transportAtom` for its `transport` value, which can be either `custom()` or `http()`
        // 2. `toKernelSmartAccount()` expects a simple client with direct RPC access
        const publicClient = createPublicClient(clientOptions)
        const walletClient = isInjected ? getInjectedClient() : getWalletClient()

        const owner = {
            async request({ method, params }: EIP1193Parameters<WalletRpcSchema>) {
                //
                if (["eth_accounts", "eth_requestAccounts"].includes(method)) {
                    return [walletAddress]
                }
                // biome-ignore lint/suspicious/noExplicitAny: correct but Typescript is broken
                return await walletClient?.request({ method, params } as any)
            },
        } as AccountWalletClient

        return await toEcdsaKernelSmartAccount({
            client: publicClient,
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7",
            },
            owners: [owner],
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
    const user = get(userAtom)
    if (!wallet?.account || !user) return undefined
    return await createKernelAccount(wallet.account.address, user.type === WalletType.Injected)
})

export const { getValue: getKernelAccount } = accessorsFromAtom(kernelAccountAtom)

export async function getKernelAccountAddress(owner: Address): Promise<Address> {
    const chain = getCurrentChain()
    const currentChain = convertToViemChain(chain)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const clientOptions = {
        transport: http(currentChain.rpcUrls[0]),
        chain: currentChain,
    }
    const publicClient = createPublicClient(clientOptions)

    // if the generated account code has a "0xef" prefix which is disallowed by the EVM, getSenderAddress()
    //  will throw so we try again with a different index value, which will produce different bytecode
    let senderFromFactory: Address
    let index = 0
    const maxRetries = 3
    while (index < maxRetries) {
        try {
            const initCode = getInitCode(contracts.ECDSAValidator, owner, contracts.KernelFactory, index)

            // account init code is the concatenation of factory staker and account init code
            const accountInitCode = concat([contracts.FactoryStaker as Hex, initCode as Hex])

            senderFromFactory = await getSenderAddress(publicClient, {
                initCode: accountInitCode,
                entryPointAddress: entryPoint07Address,
            })
            if (senderFromFactory === zeroAddress) {
                throw new Error("Kernel account address could not be determined")
            }
            break
        } catch (error) {
            if ((error as InvalidInputRpcError).details === "invalid code: must not begin with 0xef") {
                console.warn("Failed to get Kernel account address — code starting in 0xef, retrying")
                index++
            } else {
                throw new Error("Failed to get Kernal account address")
            }
        }
    }

    return senderFromFactory!
}

function getInitCode(ecdsaValidatorAddress: Address, owner: Address, factoryAddress: Address, index: number): Hex {
    return getAccountInitCode(factoryAddress, getInitializationData(ecdsaValidatorAddress, owner), index)
}

function getAccountInitCode(factoryAddress: Address, initializationData: Hex, index: number): Hex {
    return encodeFunctionData({
        abi: abis.FactoryStaker,
        functionName: "deployWithFactory",
        args: [factoryAddress, initializationData, toHex(index, { size: 32 })],
    })
}

function getInitializationData(ecdsaValidatorAddress: Address, owner: Address): Hex {
    return encodeFunctionData({
        abi: abis.Kernel,
        functionName: "initialize",
        args: [getEcdsaRootIdentifierForKernelV3(ecdsaValidatorAddress), zeroAddress, owner, "0x", []],
    })
}

const VALIDATOR_TYPE = {
    ROOT: "0x00",
    VALIDATOR: "0x01",
    PERMISSION: "0x02",
} as const

const getEcdsaRootIdentifierForKernelV3 = (validatorAddress: Address) => {
    return concatHex([VALIDATOR_TYPE.VALIDATOR, validatorAddress])
}
