import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import { createSmartAccountClient } from "permissionless"
import { type Erc7579Actions, erc7579Actions } from "permissionless/actions/erc7579"
import type { SmartAccountClient } from "permissionless/clients"
import { http } from "viem"
import type { Transport } from "viem"
import type { GetPaymasterDataParameters, GetPaymasterStubDataParameters, SmartAccount } from "viem/account-abstraction"
import { ACCOUNT_ABSTRACTION_CONTRACTS, BUNDLER_RPC_URL } from "#src/constants/accountAbstraction"
import { currentChainAtom } from "./chains"
import { type KernelSmartAccount, kernelAccountAtom } from "./kernelAccount"
import { paymasterClientAtom } from "./paymasterClient"
import { publicClientAtom } from "./publicClient"

export type KernelSmartAccountClient = SmartAccountClient<Transport, undefined, KernelSmartAccount>
export type ExtendedSmartAccountClient = SmartAccountClient & Erc7579Actions<SmartAccount>

export const smartAccountClientAtom: Atom<Promise<ExtendedSmartAccountClient>> = atom(async (get) => {
    const publicClient = get(publicClientAtom)
    const paymasterClient = get(paymasterClientAtom)
    const currentChain = get(currentChainAtom)
    const smartAccount = await get(kernelAccountAtom)

    const paymasterAddress = ACCOUNT_ABSTRACTION_CONTRACTS.HappyPaymaster
    const basicSmartAccountClient = createSmartAccountClient({
        account: smartAccount,
        chain: convertToViemChain(currentChain),
        bundlerTransport: http(BUNDLER_RPC_URL, {
            timeout: 30_000,
        }),
        paymaster: {
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
        },
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
