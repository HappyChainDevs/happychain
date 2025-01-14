import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount} from "permissionless/accounts"
import { getSenderAddress } from "permissionless/actions"
import { http, type Address, createPublicClient, createWalletClient, custom, encodeFunctionData, type Hex, zeroAddress, concatHex, toHex } from "viem"
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

    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    try{
        console.log(await getKernelAccountAddress(walletAddress))
    }
    catch(e){
        console.log("Error in getKernelAccountAddress", e)
    }
    

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

export async function getKernelAccountAddress(eoaAddress: Address): Promise<Address> {
    const chain = getCurrentChain()
    const currentChain = convertToViemChain(chain)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const clientOptions = {
        transport: http(currentChain.rpcUrls[0]),
        chain: currentChain,
    }
    console.log("contracts.KernelFactory", contracts.KernelFactory)
    console.log("contracts.Kernel", contracts.Kernel)
    console.log("contracts.FactoryStaker", contracts.FactoryStaker)
    console.log("contracts.ECDSAValidator", contracts.ECDSAValidator)

    // const initCode = await getInitData(eoaAddress, contracts.ECDSAValidator)    
    // console.log("initCode", initCode)

    // const accountInitCode = getAccountInitData(contracts.KernelFactory, initCode, 0)
    // console.log("accountInitCode", accountInitCode) 
    const publicClient = createPublicClient(clientOptions)
    const senderFromFactory = await getSenderAddress(publicClient, {
        factory: contracts.FactoryStaker,
        factoryData: "0xc5265d5d0000000000000000000000006a780409766a691be9b94deb0a38f151fc55e1cb0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01E381F2e50BCF828Cd441155Cb72533D1cAC31c3b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014fdc42702574ac7f8338a4be4dae119db137cdb3c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        entryPointAddress: entryPoint07Address,
    })
    console.log("senderFromFactory", senderFromFactory) 

    
    return senderFromFactory
}

// from prepare userOp fresh account; factoryData is "0xc5265d5d0000000000000000000000006a780409766a691be9b94deb0a38f151fc55e1cb0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01E381F2e50BCF828Cd441155Cb72533D1cAC31c3b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014fdc42702574ac7f8338a4be4dae119db137cdb3c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
/*account
: 
{client: {…}, entryPoint: {…}, getFactoryArgs: ƒ, getAddress: ƒ, encodeCalls: ƒ, …}
callData
: 
"0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003416e3d9dd995CDb5Dae7F09B9A64f7934FE5d4A39000000000000000000000000000000000000000000000000001ff973cafa8000000000000000000000000000"
callGasLimit
: 
127958n
factory
: 
"0x5122Da4E809C0DbaE831d718D116Dd93eD40B18D"
factoryData
: 
"0xc5265d5d0000000000000000000000006a780409766a691be9b94deb0a38f151fc55e1cb0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01E381F2e50BCF828Cd441155Cb72533D1cAC31c3b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014fdc42702574ac7f8338a4be4dae119db137cdb3c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
maxFeePerGas
: 
1000302n
maxPriorityFeePerGas
: 
1000000n
nonce
: 
1570199833640218989384977091216302172224847740937201239962432834239463424n
paymaster
: 
"0xb2a961de53D9e9493d4921b9e36300775F4AF508"
paymasterData
: 
"0x"
paymasterPostOpGasLimit
: 
1n
paymasterVerificationGasLimit
: 
45000n
preVerificationGas
: 
56394n
sender
: 
"0x91307a0d9d232BE7656fb4b4802a02975fBbE4f8"
signature
: 
"0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
verificationGasLimit
: 
405219n

*/


// async function getSenderAddressWithInitCode(
//     client: any,
//     initCode: Hex,
//     entryPointAddress: Address
// ) {
//     // construct call to getSenderAddress on EntryPointSimulation contract
//     const res = encodeFunctionData({
//         abi: EntryPointSimulationAbi,
//         functionName: "getSenderAddress",
//         args: [initCode]
//     })
//     // now call with viem
//     const address = await client.call({
//         to: entryPointAddress,
//         data: res,
//     })
//     console.log("getSenderAddressWithInitCode:: direct address", address)
// }


function getInitData(owner: Address, ecdsaValidatorAddress: Address): Hex {
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



export const kernelAccountAtom: Atom<Promise<KernelSmartAccount | undefined>> = atom(async (get) => {
    const wallet = get(walletClientAtom)
    if (!wallet?.account) return undefined
    return await createKernelAccount(wallet.account.address)
})

export const { getValue: getKernelAccount } = accessorsFromAtom(kernelAccountAtom)

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

export const getEcdsaRootIdentifierForKernelV3 = (
    validatorAddress: Address
) => {
    const res = concatHex([VALIDATOR_TYPE.VALIDATOR, validatorAddress])
    console.log("getEcdsaRootIdentifierForKernelV3:: res", res)
    return res
}
function getAccountInitData(factoryAddress: Address, initializationData: Hex, index: number): Hex {
    return encodeFunctionData({
        abi: KernelV3MetaFactoryDeployWithFactoryAbi,
        functionName: "deployWithFactory",
        args: [factoryAddress, initializationData, toHex(index, { size: 32 })]
    })
}

const EntryPointSimulationAbi = [
    {
        "type": "function",
        "name": "getSenderAddress",
        "inputs": [
          {
            "name": "initCode",
            "type": "bytes",
            "internalType": "bytes"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
] as const  
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

export const VALIDATOR_TYPE = {
    ROOT: "0x00",
    VALIDATOR: "0x01",
    PERMISSION: "0x02"
} as const
export enum VALIDATOR_MODE {
    DEFAULT = "0x00",
    ENABLE = "0x01"
}
