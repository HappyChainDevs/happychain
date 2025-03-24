import { useMemo, useState } from "react"
import { type Address, erc20Abi, formatEther, formatUnits, isAddress } from "viem"
import { useBalance, useReadContracts } from "wagmi"

/**
 * Get token (ERC20, native) balance for a given address.
 */
export function useTokenBalance({
    userAddress,
    tokenAddress,
}: {
    userAddress: Address
    tokenAddress?: Address
}) {
    const erc20TokenAddress = useState(tokenAddress)
    const [config] = erc20TokenAddress

    const queryBalanceNativeToken = useBalance({
        address: userAddress,
        query: {
            enabled: isAddress(userAddress) && !config,
        },
    })

    const queryBalanceERC20Token = useReadContracts({
        contracts: [
            {
                abi: erc20Abi,
                address: config as Address,
                functionName: "balanceOf",
                args: [userAddress],
            },
            {
                abi: erc20Abi,
                address: config as Address,
                functionName: "decimals",
            },
        ],
        query: {
            enabled: isAddress(`${config}`) && isAddress(userAddress),
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            select(data) {
                const [balanceResult, decimalsResult] = data
                const balance = balanceResult.result as bigint
                const decimals = decimalsResult.result as number
                const formatted =
                    balance !== undefined && decimals !== undefined ? +formatUnits(balance, decimals) : undefined
                return formatted
            },
        },
    })

    const balance = useMemo(() => {
        if (!config) {
            if (queryBalanceNativeToken?.data?.value) return +formatEther(queryBalanceNativeToken?.data?.value)
            return 0
        }
        if (queryBalanceERC20Token?.data) return queryBalanceERC20Token?.data ?? 0

        return 0
    }, [config, queryBalanceNativeToken?.data?.value, queryBalanceERC20Token?.data])

    return {
        queryBalanceNativeToken,
        queryBalanceERC20Token,
        erc20TokenAddress,
        balance,
    }
}
