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
import { paymasterClientAtom } from "./paymasterClient"
import { publicClientAtom } from "./publicClient"
import { type KernelSmartAccount, kernelAccountAtom } from "./smartAccount"

export type KernelSmartAccountClient = SmartAccountClient<Transport, undefined, KernelSmartAccount>
export const kernelClientAtom: Atom<Promise<SmartAccountClient & Erc7579Actions<SmartAccount>>> = atom(async (get) => {
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
                    paymasterData: "0x", // Only required for extra context, no need to encode paymaster gas values manually
                    paymasterVerificationGasLimit: gasEstimates.paymasterVerificationGasLimit ?? 0n,
                    paymasterPostOpGasLimit: gasEstimates.paymasterPostOpGasLimit ?? 0n,
                }
            },

            // Using stub values from the docs for paymaster-related fields in unsigned user operations for gas estimation.
            async getPaymasterStubData(_parameters: GetPaymasterStubDataParameters) {
                return {
                    paymaster: paymasterAddress,
                    paymasterData: "0x",
                    paymasterVerificationGasLimit: 80_000n, // Increased value to account for possible higher gas usage
                    paymasterPostOpGasLimit: 0n, // Set to 0 since the postOp function is never called
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
    return smartAccountClientWithExtensions as typeof basicSmartAccountClient & typeof smartAccountClientWithExtensions
})
