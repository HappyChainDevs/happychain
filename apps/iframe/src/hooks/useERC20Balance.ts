import { type Address, type ContractFunctionParameters, erc20Abi, formatUnits } from "viem"
import { type UseReadContractsReturnType, useReadContracts } from "wagmi"

type ERC20BalanceQueryData = {
    value?: bigint
    decimals?: number
    symbol?: string
    formatted?: string // formatted value of user's token balance for display
}

export type UseERC20BalanceReturnType = UseReadContractsReturnType<
    readonly ContractFunctionParameters[],
    true,
    ERC20BalanceQueryData
>

/**
 * Hook that uses [useReadContracts](https://wagmi.sh/react/api/hooks/useReadContracts)
 * to read the ERC-20 token's `decimals`, `balanceOf`, `symbols` methods.
 *
 * The returned value is an object that has the decimals, held value, symbol of the token,
 * and a `formatted` value - using the obtained decimals value to format the balance,
 * to be used in the UI.
 */
export function useERC20Balance(
    assetAddr: Address,
    userAddr: Address,
    enableRefetch = false,
): UseERC20BalanceReturnType {
    const tokenContract = {
        address: assetAddr,
        abi: erc20Abi,
    }

    const result = useReadContracts({
        contracts: [
            {
                ...tokenContract,
                functionName: "balanceOf",
                args: [userAddr],
            },
            {
                ...tokenContract,
                functionName: "decimals",
            },
            {
                ...tokenContract,
                functionName: "symbol",
            },
        ],
        query: {
            enabled: !!assetAddr && !!userAddr,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // disable automatic refetching on refocus / remount
            refetchOnWindowFocus: enableRefetch,
            refetchOnMount: enableRefetch,
            // format fetched data
            select(data): ERC20BalanceQueryData {
                const [balanceResult, decimalsResult, symbolResult] = data
                const value = balanceResult.result
                const decimals = decimalsResult.result
                const symbol = symbolResult.result as string | undefined

                // compute formatted value only if both values are read from the contract
                const formatted =
                    value !== undefined && decimals !== undefined ? formatUnits(value, decimals) : undefined

                return {
                    value,
                    decimals,
                    symbol,
                    formatted,
                }
            },
        },
    })

    return result
}
