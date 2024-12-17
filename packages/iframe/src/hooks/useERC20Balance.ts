import { type Address, type ContractFunctionParameters, erc20Abi, formatUnits } from "viem"
import { type UseReadContractsReturnType, useReadContracts } from "wagmi"

type ERC20BalanceQueryData = {
    value?: bigint
    decimals?: number
    formatted?: string
}

export type UseERC20BalanceReturnType = UseReadContractsReturnType<
    readonly ContractFunctionParameters[],
    true,
    ERC20BalanceQueryData
>

/**
 * Hook that uses [useReadContracts](https://wagmi.sh/react/api/hooks/useReadContracts)
 * to read the ERC-20 token's `decimals` and `balanceOf` methods.
 *
 * The returned value is an object that has the held value, decimals of the token,
 * and a `formatted` value - using the obtained decimals value to format the balance,
 * to be used in the UI.
 */
export function useERC20Balance(assetAddr: Address, userAddr: Address): UseERC20BalanceReturnType {
    const tokenContract = {
        address: assetAddr,
        abi: erc20Abi,
    }

    const result = useReadContracts({
        contracts: [
            {
                ...tokenContract,
                functionName: "balanceOf",
                args: [userAddr!],
            },
            {
                ...tokenContract,
                functionName: "decimals",
            },
        ],
        query: {
            select(data): ERC20BalanceQueryData {
                const [balanceResult, decimalsResult] = data
                const value = balanceResult.result
                const decimals = decimalsResult.result

                return {
                    value,
                    decimals,
                    // compute formatted value only if both values are read from the contract,
                    // else indicate error to user
                    formatted: value && decimals ? formatUnits(value, decimals) : undefined,
                }
            },
        },
    })

    return result
}
