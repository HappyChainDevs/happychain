import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { createSmartAccountClient } from "permissionless"
import { type Erc7579Actions, erc7579Actions } from "permissionless/actions/erc7579"
import type { SmartAccountClient } from "permissionless/clients"
import { http } from "viem"
import type { Transport } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { BUNDLER_RPC_URL } from "#src/constants/accountAbstraction"
import { currentChainAtom } from "./chains"
import { type KernelSmartAccount, kernelAccountAtom } from "./kernelAccount"
import { paymasterAtom } from "./paymaster"
import { publicClientAtom } from "./publicClient"

export type KernelSmartAccountClient = SmartAccountClient<Transport, undefined, KernelSmartAccount>
export type ExtendedSmartAccountClient = SmartAccountClient & Erc7579Actions<SmartAccount>

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

    const smartAccountClientWithExtensions = basicSmartAccountClient.extend(erc7579Actions())
    return smartAccountClientWithExtensions as unknown as ExtendedSmartAccountClient
})

export const { getValue: getSmartAccountClient } = accessorsFromAtom(smartAccountClientAtom)
