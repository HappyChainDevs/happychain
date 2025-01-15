import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount} from "permissionless/accounts"
import { getSenderAddress } from "permissionless/actions"
import { http, type Address, createPublicClient, encodeFunctionData, type Hex, zeroAddress, concatHex, toHex, concat } from "viem"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"
import { getCurrentChain } from "./chains"
import { walletClientAtom } from "./walletClient"
import { getWalletClient } from "#src/state/walletClient"


export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">

export async function createKernelAccount(walletAddress: Address): Promise<KernelSmartAccount | undefined> {
    const chain = getCurrentChain()
    const currentChain = convertToViemChain(chain)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const clientOptions = {
        transport: http(currentChain.rpcUrls[0]),
        chain: currentChain,
    }

    try {
        // We can't use `publicClientAtom` and need to recreate a public client since :
        // 1. `publicClientAtom` uses `transportAtom` for its `transport` value, which can be either `custom()` or `http()`
        // 2. `toKernelSmartAccount()` expects a simple client with direct RPC access
        const publicClient = createPublicClient(clientOptions)
        const walletClient = getWalletClient()
        
        const owner = {
            async request({ method, params }: any) {
                if (["eth_accounts", "eth_requestAccounts"].includes(method)) {
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
    const formattedInitCode = concat([contracts.FactoryStaker as Hex, initCode as Hex])
    const senderFromFactory = await getSenderAddress(publicClient, {
        initCode: formattedInitCode,
        entryPointAddress: entryPoint07Address,
    })
    console.log("senderFromInitCode", senderFromFactory) 

    
    return senderFromFactory
}


function getInitCode(ecdsaValidatorAddress: Address, owner: Address, factoryAddress: Address): Hex {
    const initData = getInitializationData(ecdsaValidatorAddress, owner)
    const accountInitCode = getAccountInitCode(factoryAddress, initData, 0)
    return accountInitCode 
}   

function getAccountInitCode(factoryAddress: Address, initializationData: Hex, index: number): Hex {
    return encodeFunctionData({
        abi: KernelV3MetaFactoryDeployWithFactoryAbi,
        functionName: "deployWithFactory",
        args: [factoryAddress, initializationData, toHex(index, { size: 32 })]
    })
}

function getInitializationData(ecdsaValidatorAddress: Address, owner: Address): Hex {
    return encodeFunctionData({
        abi: KernelV3_1AccountAbi,
        functionName: "initialize",
        args: [
            getEcdsaRootIdentifierForKernelV3(ecdsaValidatorAddress),
            zeroAddress,
            owner,
            "0x",
            []
        ]
    })
}

export const VALIDATOR_TYPE = {
    ROOT: "0x00",
    VALIDATOR: "0x01",
    PERMISSION: "0x02"
} as const
export enum VALIDATOR_MODE {
    DEFAULT = "0x00",
    ENABLE = "0x01"
}


export const getEcdsaRootIdentifierForKernelV3 = (
    validatorAddress: Address
) => {
    const ecdsaRoot = concatHex([VALIDATOR_TYPE.VALIDATOR, validatorAddress])
    console.log("ecdsaRoot", ecdsaRoot)
    return ecdsaRoot    
}


export const KernelV3MetaFactoryDeployWithFactoryAbi = [
    {
        type: "function",
        name: "deployWithFactory",
        inputs: [
            {
                name: "factory",
                type: "address",
                internalType: "contract KernelFactory"
            },
            { name: "createData", type: "bytes", internalType: "bytes" },
            { name: "salt", type: "bytes32", internalType: "bytes32" }
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "payable"
    }
] as const

export const KernelV3_1AccountAbi = [
    {
        type: "function",
        name: "initialize",
        inputs: [
            {
                name: "_rootValidator",
                type: "bytes21",
                internalType: "ValidationId"
            },
            { name: "hook", type: "address", internalType: "contract IHook" },
            { name: "validatorData", type: "bytes", internalType: "bytes" },
            { name: "hookData", type: "bytes", internalType: "bytes" },
            { name: "initConfig", type: "bytes[]", internalType: "bytes[]" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    }
] as const
