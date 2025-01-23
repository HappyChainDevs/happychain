import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { createSmartAccountClient } from "permissionless"
import { type Erc7579Actions, erc7579Actions } from "permissionless/actions/erc7579"
import type { SmartAccountActions } from "permissionless/clients"
import { http } from "viem"
import type { BundlerRpcSchema, Chain, Client, Transport } from "viem"
import type { BundlerActions } from "viem/account-abstraction"
import { BUNDLER_RPC_URL } from "#src/constants/accountAbstraction"
import { currentChainAtom } from "./chains"
import { type KernelSmartAccount, kernelAccountAtom } from "./kernelAccount"
import { paymasterAtom } from "./paymaster"
import { publicClientAtom } from "./publicClient"

export type ExtendedSmartAccountClient = Client<
    Transport,
    Chain | undefined,
    KernelSmartAccount,
    BundlerRpcSchema,
    BundlerActions & SmartAccountActions & Erc7579Actions<KernelSmartAccount>
>

export const smartAccountClientAtom: Atom<Promise<ExtendedSmartAccountClient | undefined>> = atom(async (get) => {
    const smartAccount = await get(kernelAccountAtom)
    if (!smartAccount) return undefined
    const publicClient = get(publicClientAtom)
    const currentChain = get(currentChainAtom)
    const paymaster = await get(paymasterAtom)
    const basicSmartAccountClient = createSmartAccountClient({
        account: smartAccount,
        chain: convertToViemChain(currentChain),
        bundlerTransport: http(BUNDLER_RPC_URL),
        paymaster,
        userOperation: {
            estimateFeesPerGas: async () => {
                return await publicClient.estimateFeesPerGas()
            },
        },
    })

    return basicSmartAccountClient.extend(erc7579Actions())
})

export const { getValue: getSmartAccountClient } = accessorsFromAtom(smartAccountClientAtom)
