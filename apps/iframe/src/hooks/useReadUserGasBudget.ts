import type { Address, UInt32 } from "@happy.tech/common"
import { type UseReadContractReturnType, useReadContract } from "wagmi"
import { happyPaymaster, happyPaymasterAbi } from "#src/constants/contracts"

/**
 * Maximum cumulative gas budget per user as defined in the HappyPaymaster contract.
 */
const MAX_GAS_BUDGET: UInt32 = 1_000_000_000

/**
 * Structured gas budget info for UI display:
 * - `batteryHealth`: discrete level 0–4
 * - `batteryPct`: percentage of MAX_GAS_BUDGET (0–100).
 */
export type UserGasBudgetInfo = {
    batteryHealth: number
    batteryPct: number
}

/**
 * Wagmi return type for the `getBudget` read call, mapped to `UserGasBudgetInfo`.
 */
export type UseReadUserGasBudgetReturnType = UseReadContractReturnType<
    typeof happyPaymasterAbi,
    "getBudget",
    [Address],
    UserGasBudgetInfo
>

/**
 * Hook to fetch and map a user's gas budget from the HappyPaymaster contract.
 *
 * @param userAddress - address of the user whose budget to read
 * @returns Wagmi query object with:
 *   - `data`: `{ batteryHealth, batteryPct }`
 *   - `isLoading`, `isError`, `refetch`, etc.
 * @throws Error if no userAddress is provided.
 */
export const useReadUserGasBudget = (userAddress?: Address): UseReadUserGasBudgetReturnType => {
    if (!userAddress) throw new Error("No user found!")

    const result = useReadContract({
        address: happyPaymaster,
        abi: happyPaymasterAbi,
        functionName: "getBudget",
        args: [userAddress],
        query: {
            enabled: Boolean(!!userAddress),
            refetchInterval: 2000,
            /**
             * Maps the raw onchain gas budget to UI-friendly battery info.
             * @param userGasBudget - raw uint32 gas budget from contract
             */
            select(userGasBudget) {
                const pct = userGasBudget / MAX_GAS_BUDGET
                return {
                    batteryHealth: Math.round(pct * 4),
                    batteryPct: Number((pct * 100).toFixed(2)),
                }
            },
        },
    })

    return result
}
