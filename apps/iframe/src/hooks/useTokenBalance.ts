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
    const configQueryToken = useState(tokenAddress)
    const [config] = configQueryToken

    const queryBalanceNativeToken = useBalance({
        address: userAddress,
        query: {
            enabled: userAddress && isAddress(userAddress) && !isAddress(`${config}`),
        },
    })

    const queryBalanceERC20Token = useReadContracts({
        contracts: [
            {
                abi: erc20Abi,
                address: config,
                functionName: "balanceOf",
                args: [userAddress],
            },
            {
                abi: erc20Abi,
                address: config,
                functionName: "decimals",
            },
        ],
        query: {
            enabled: isAddress(`${config}`) && isAddress(userAddress),
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            select(data) {
                const [balanceResult, decimalsResult] = data
                const balance = balanceResult.result
                const decimals = decimalsResult.result

                return balance !== undefined && decimals !== undefined ? formatUnits(balance, decimals) : undefined
            },
        },
    })

    const balance = useMemo(() => {
        if (!isAddress(`${config}`)) {
            if (queryBalanceNativeToken?.data?.value) return +formatEther(queryBalanceNativeToken?.data?.value)
            return 0
        }
        if (queryBalanceERC20Token?.data) return +queryBalanceERC20Token?.data

        return 0
    }, [config, queryBalanceNativeToken?.data?.value, queryBalanceERC20Token?.data])

    return {
        queryBalanceNativeToken,
        queryBalanceERC20Token,
        configQueryToken,
        balance,
    }
}
