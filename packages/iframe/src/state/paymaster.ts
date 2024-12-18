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
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"
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

/**
 * Gas limit constants derived and adjusted on actual usage measured in {@link https://github.com/HappyChainDevs/happychain/blob/master/packages/contracts/bundler_gas_report.txt | bundler_gas_report.txt}.
 * Some of these values are slightly higher than observed gas usage, for safety margin.
 *
 * @see {@link https://github.com/HappyChainDevs/happychain/blob/master/packages/contracts/bundler_gas_report.txt | Full gas measurements report}
 *
 * @todo - Adjust these values if :
 * 1. The paymaster implementation changes
 * 2. Significant changes in gas usage patterns are observed
 */
const PAYMASTER_VERIFICATION_GAS_LIMIT_WITH_FACTORY = 45000n
const PAYMASTER_VERIFICATION_GAS_LIMIT_WITHOUT_FACTORY = 25000n
const PAYMASTER_POST_OP_GAS_LIMIT = 1n // Set to 1 since the postOp function is never called

const PAYMASTER_DATA = "0x00" as const
const getPaymasterVerificationGasLimit = (factory?: Hex) =>
    factory && factory !== "0x"
        ? PAYMASTER_VERIFICATION_GAS_LIMIT_WITH_FACTORY
        : PAYMASTER_VERIFICATION_GAS_LIMIT_WITHOUT_FACTORY

export const paymasterAtom = atom(async (get) => {
    const currentChain = get(currentChainAtom)
    const contracts = getAccountAbstractionContracts(currentChain.chainId)
    const paymasterAddress = contracts.HappyPaymaster

    return {
        /**
         * Provides paymaster data for UserOperations with pre-configured gas limits.
         * Gas values are based on actual measurements from our bundler gas report.
         *
         */
        async getPaymasterData(parameters: GetPaymasterDataParameters) {
            const paymasterVerificationGasLimit = getPaymasterVerificationGasLimit(parameters.factory)
            return {
                paymaster: paymasterAddress,
                paymasterData: PAYMASTER_DATA, // Only required for extra context, no need to encode paymaster gas values manually
                paymasterPostOpGasLimit: PAYMASTER_POST_OP_GAS_LIMIT,
                paymasterVerificationGasLimit,
            }
        },

        /**
         * Provides stub data for gas estimation of unsigned user operations.
         *
         * Note: We're using same values as `getPaymasterData` here since stub values
         * only need to match the format and approximate scale of real data.
         */
        async getPaymasterStubData(parameters: GetPaymasterStubDataParameters) {
            const paymasterVerificationGasLimit = getPaymasterVerificationGasLimit(parameters.factory)

            return {
                paymaster: paymasterAddress,
                paymasterData: PAYMASTER_DATA,
                paymasterPostOpGasLimit: PAYMASTER_POST_OP_GAS_LIMIT,
                paymasterVerificationGasLimit,
            }
        },
    } satisfies PaymasterConfig
})

export const { getValue: getPaymaster } = accessorsFromAtom(paymasterAtom)
