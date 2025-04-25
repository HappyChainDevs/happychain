// import { WalletType, convertToViemChain } from "@happy.tech/wallet-common"
// import { type Atom, atom } from "jotai"
// import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
// import { http, type Address, type EIP1193Parameters, type WalletRpcSchema, createPublicClient } from "viem"
// import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
// import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"
// import { getCurrentChain } from "./chains"
// import { getInjectedClient } from "./injectedClient"
// import { userAtom } from "./user"
// import { type AccountWalletClient, getWalletClient, walletClientAtom } from "./walletClient"

// export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">

// async function createKernelAccount(
//     walletAddress: Address,
//     isInjected: boolean,
// ): Promise<KernelSmartAccount | undefined> {
//     const chain = getCurrentChain()
//     const currentChain = convertToViemChain(chain)
//     const contracts = getAccountAbstractionContracts(chain.chainId)
//     const clientOptions = {
//         transport: http(currentChain.rpcUrls.default.http[0]),
//         chain: currentChain,
//     }
//     try {
//         // We can't use `publicClientAtom` and need to recreate a public client since :
//         // 1. `publicClientAtom` uses `transportAtom` for its `transport` value, which can be either `custom()` or `http()`
//         // 2. `toKernelSmartAccount()` expects a simple client with direct RPC access
//         const publicClient = createPublicClient(clientOptions)
//         const walletClient = isInjected ? getInjectedClient() : getWalletClient()

//         const owner = {
//             async request({ method, params }: EIP1193Parameters<WalletRpcSchema>) {
//                 if (["eth_accounts", "eth_requestAccounts"].includes(method)) {
//                     return [walletAddress]
//                 }
//                 // biome-ignore lint/suspicious/noExplicitAny: correct but Typescript is broken
//                 return await walletClient?.request({ method, params } as any)
//             },
//         } as AccountWalletClient

//         return await toEcdsaKernelSmartAccount({
//             client: publicClient,
//             entryPoint: {
//                 address: entryPoint07Address,
//                 version: "0.7",
//             },
//             owners: [owner],
//             version: "0.3.1",
//             ecdsaValidatorAddress: contracts.ECDSAValidator,
//             accountLogicAddress: contracts.Kernel,
//             factoryAddress: contracts.KernelFactory,
//             metaFactoryAddress: contracts.FactoryStaker,
//         })
//     } catch (error) {
//         console.error("Kernel account could not be created:", error)
//         return undefined
//     }
// }

// export const kernelAccountAtom: Atom<Promise<KernelSmartAccount | undefined>> = atom(async (get) => {
//     const wallet = get(walletClientAtom)
//     const user = get(userAtom)
//     if (!wallet?.account || !user) return undefined
//     return await createKernelAccount(wallet.account.address, user.type === WalletType.Injected)
// })
