import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type PimlicoClient, createPimlicoClient } from "permissionless/clients/pimlico"
import { http } from "viem"
import { entryPoint07Address } from "viem/account-abstraction"
import { BUNDLER_RPC_URL } from "#src/constants/accountAbstraction"
import { currentChainAtom } from "./chains"

export const paymasterClientAtom: Atom<PimlicoClient> = atom((get) => {
    const currentChain = get(currentChainAtom)
    return createPimlicoClient({
        chain: convertToViemChain(currentChain),
        transport: http(BUNDLER_RPC_URL),
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
    })
})

type GetPaymasterClient = () => PimlicoClient

export const {
    getValue: getPaymasterClient,
}: {
    getValue: GetPaymasterClient
} = accessorsFromAtom(paymasterClientAtom)
