import { formatUserBalance } from "@happychain/sdk-shared"
import { type Address, erc20Abi } from "viem"
import { useReadContracts } from "wagmi"

type ERC20BalanceQueryData = {
    value: bigint
    decimals: number | undefined
    formatted: string
}

/**
 * Hook that uses [useReadContracts](https://wagmi.sh/react/api/hooks/useReadContracts)
 * to read the ERC-20 token's `decimals` and `balanceOf` methods.
 *
 * The returned value is an object that has the held value, decimals of the token,
 * and a `formatted` value - using the obtained decimals value to format the balance,
 * to be used in the UI.
 */
export function useERC20Balance(assetAddr: Address, userAddr: Address): { data?: ERC20BalanceQueryData } {
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
                const value = balanceResult.result ?? 0n
                const decimals = decimalsResult.result ?? 18

                return {
                    value,
                    decimals,
                    formatted: formatUserBalance(value, decimals),
                }
            },
        },
    })

    return result
}
