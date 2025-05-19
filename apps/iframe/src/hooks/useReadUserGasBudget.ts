import type { Address, UInt32 } from "@happy.tech/common"
import { type UseReadContractReturnType, useReadContract } from "wagmi"
import { happyPaymaster, happyPaymasterAbi } from "#src/constants/contracts"

// constant defined in the HappyPaymaster contract
const MAX_GAS_BUDGET: UInt32 = 1_000_000_000

export type BatteryHealthIndicator = 0 | 1 | 2 | 3 | 4

const BUDGET_THRESHOLDS = [
    0,
    MAX_GAS_BUDGET / 4, // 250_000_000
    (MAX_GAS_BUDGET * 2) / 4, // 500_000_000
    (MAX_GAS_BUDGET * 3) / 4, // 750_000_000
    MAX_GAS_BUDGET,
]

export type UserGasBudgetInfo = {
    batteryHealth: BatteryHealthIndicator
    batteryPct: number
}

export type UseReadUserGasBudgetReturnType = UseReadContractReturnType<
    typeof happyPaymasterAbi,
    "getBudget",
    [Address],
    UserGasBudgetInfo
>

export const useReadUserGasBudget = (userAddress?: Address): UseReadUserGasBudgetReturnType => {
    if (!userAddress) throw new Error("No user found!")

    const result = useReadContract({
        address: happyPaymaster,
        abi: happyPaymasterAbi,
        functionName: "getBudget",
        args: [userAddress],
        query: {
            enabled: Boolean(userAddress),
            select(userGasBudget) {
                let batteryHealth: BatteryHealthIndicator = 0
                for (let i = BUDGET_THRESHOLDS.length - 1; i >= 0; i--) {
                    if (userGasBudget >= BUDGET_THRESHOLDS[i]) {
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
