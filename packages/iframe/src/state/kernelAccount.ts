import { accessorsFromAtom } from "@happychain/common"
import { abis } from "@happychain/contracts/account-abstraction/sepolia"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { getSenderAddress } from "permissionless/actions"
import {
    http,
    type Address,
    type Hex,
    type WalletClient,
    concat,
    concatHex,
    createPublicClient,
    encodeFunctionData,
    toHex,
    zeroAddress,
} from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { getWalletClient } from "#src/state/walletClient"
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"
import { getCurrentChain } from "./chains"
import { walletClientAtom } from "./walletClient"

export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">

export async function createKernelAccount(walletAddress: Address): Promise<KernelSmartAccount | undefined> {
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
        const walletClient = getWalletClient()

        const owner = {
            // biome-ignore lint/suspicious/noExplicitAny: todo
            async request({ method, params }: any) {
                //
                if (["eth_accounts", "eth_requestAccounts"].includes(method)) {
                    return [walletAddress]
                }
                return await walletClient?.request({ method, params })
            },
        } as WalletClient

        return await toEcdsaKernelSmartAccount({
            client: publicClient,
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7",
            },
            // biome-ignore lint/suspicious/noExplicitAny: todo same as above
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

export async function getKernelAccountAddress(owner: Address): Promise<Address> {
    const chain = getCurrentChain()
    const currentChain = convertToViemChain(chain)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const clientOptions = {
        transport: http(currentChain.rpcUrls[0]),
        chain: currentChain,
    }
    const publicClient = createPublicClient(clientOptions)
    const initCode = getInitCode(contracts.ECDSAValidator, owner, contracts.KernelFactory)

    // account init code is the concatenation of factory staker and account init code
    const accountInitCode = concat([contracts.FactoryStaker as Hex, initCode as Hex])
    const senderFromFactory = await getSenderAddress(publicClient, {
        initCode: accountInitCode,
        entryPointAddress: entryPoint07Address,
    })
    return senderFromFactory
}

function getInitCode(ecdsaValidatorAddress: Address, owner: Address, factoryAddress: Address): Hex {
    return getAccountInitCode(factoryAddress, getInitializationData(ecdsaValidatorAddress, owner), 0)
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
