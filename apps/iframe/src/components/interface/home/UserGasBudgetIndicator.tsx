import {
    BatteryEmpty,
    BatteryFull,
    BatteryHigh,
    BatteryLow,
    BatteryMedium,
    type Icon,
    Spinner,
} from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import type { ClassValue } from "class-variance-authority/types"
import { type BatteryHealthIndicator, useReadUserGasBudget } from "#src/hooks/useReadUserGasBudget.ts"
import { getUser } from "#src/state/user.ts"

const colorMap: Record<BatteryHealthIndicator, ClassValue> = {
    0: "text-error animate-pulse",
    1: "text-warning/60",
    2: "text-warning",
    3: "text-success/80",
    4: "text-success",
}

const batteryIconStates: Record<BatteryHealthIndicator, Icon> = {
    0: BatteryEmpty,
    1: BatteryLow,
    2: BatteryMedium,
    3: BatteryHigh,
    4: BatteryFull,
}

export const UserGasBudgetIndicator = () => {
    const user = getUser()
    const {
        data: { batteryHealth, batteryPct } = {},
        isLoading,
    } = useReadUserGasBudget(user?.address)

    console.log({ batteryHealth, batteryPct })

    if (isLoading || batteryHealth === undefined) return <Spinner weight="bold" className="text-lg mr-1 dark:opacity-60" />

    const BatteryIcon = batteryIconStates[batteryHealth]
    const colorClass = colorMap[batteryHealth]

    return (
        <button title={`${batteryPct}%`} type="button" aria-label={"gas budget"} className="dark:opacity-60">
            <BatteryIcon weight="bold" className={cx(colorClass, "text-lg", "mr-1")} />
        </button>
    )
}
