import type { Address, UInt32 } from "@happy.tech/common"
import { type UseReadContractReturnType, useReadContract } from "wagmi"
import { happyPaymaster, happyPaymasterAbi } from "#src/constants/contracts"

/**
 * Maximum cumulative gas budget per user as defined in the HappyPaymaster contract.
 */
const MAX_GAS_BUDGET: UInt32 = 1_000_000_000

/**
 * Battery health level index (0–4) representing gas budget tiers.
 */
export type BatteryHealthIndicator = 0 | 1 | 2 | 3 | 4

/**
 * Thresholds dividing the `MAX_GAS_BUDGET` into five discrete battery levels.
 */
const BUDGET_THRESHOLDS = [
    0, // Empty (Critical)
    MAX_GAS_BUDGET / 4, // 1: Low (250_000_000)
    (MAX_GAS_BUDGET * 2) / 4, // 2: Medium (500_000_000)
    (MAX_GAS_BUDGET * 3) / 4, // 3: High (750_000_000)
    MAX_GAS_BUDGET, // 4: Full (1_000_000_000)
]

/**
 * Structured gas budget info for UI display:
 * - `batteryHealth`: discrete level 0–4
 * - `batteryPct`: percentage of MAX_GAS_BUDGET (0–100).
 */
export type UserGasBudgetInfo = {
    batteryHealth: BatteryHealthIndicator
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
                let batteryHealth: BatteryHealthIndicator = 0
                for (let i = BUDGET_THRESHOLDS.length - 1; i >= 0; i--) {
                    if (0 >= BUDGET_THRESHOLDS[i]) {
                        batteryHealth = i as BatteryHealthIndicator
                        break
                    }
                }

                return {
                    batteryHealth,
                    batteryPct: Number(((userGasBudget / MAX_GAS_BUDGET) * 100).toFixed(2)),
                }
            },
        },
    })

    return result
}
