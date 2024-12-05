import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { type PimlicoClient, createPimlicoClient } from "permissionless/clients/pimlico"
import { http, type Address, type Hex } from "viem"
import {
    type GetPaymasterDataParameters,
    type GetPaymasterStubDataParameters,
    entryPoint07Address,
} from "viem/account-abstraction"
import { BUNDLER_RPC_URL } from "#src/constants/accountAbstraction"
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts.ts"
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

const accessorsClient = accessorsFromAtom(paymasterClientAtom)
export const getPaymasterClient = accessorsClient.getValue as () => PimlicoClient

export type PaymasterConfig = {
    getPaymasterData: (parameters: GetPaymasterDataParameters) => Promise<{
        paymaster: Address
        paymasterData: Hex
        paymasterVerificationGasLimit: bigint
        paymasterPostOpGasLimit: bigint
    }>
    getPaymasterStubData: (parameters: GetPaymasterStubDataParameters) => Promise<{
        paymaster: Address
        paymasterData: Hex
        paymasterVerificationGasLimit: bigint
        paymasterPostOpGasLimit: bigint
    }>
}

export const paymasterAtom = atom(async (get) => {
    const paymasterClient = get(paymasterClientAtom)
    const currentChain = get(currentChainAtom)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const paymasterAddress = contracts.HappyPaymaster

    return {
        async getPaymasterData(parameters: GetPaymasterDataParameters) {
            const gasEstimates = await paymasterClient.estimateUserOperationGas({
                ...parameters,
                paymaster: paymasterAddress,
            })

            return {
                paymaster: paymasterAddress,
                paymasterData: "0x",
                paymasterVerificationGasLimit: gasEstimates.paymasterVerificationGasLimit ?? 0n,
                paymasterPostOpGasLimit: gasEstimates.paymasterPostOpGasLimit ?? 0n,
            }
        },

        async getPaymasterStubData(_parameters: GetPaymasterStubDataParameters) {
            return {
                paymaster: paymasterAddress,
                paymasterData: "0x",
                paymasterVerificationGasLimit: 80_000n,
                paymasterPostOpGasLimit: 0n,
            }
        },
    } satisfies PaymasterConfig
})

export const { getValue: getPaymaster } = accessorsFromAtom(paymasterAtom)
