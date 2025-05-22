import {
    BatteryFullIcon,
    BatteryHighIcon,
    BatteryLowIcon,
    BatteryMediumIcon,
    BatteryWarningIcon,
    type Icon,
    SpinnerIcon,
} from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import type { ClassValue } from "class-variance-authority/types"
import { useReadUserGasBudget } from "#src/hooks/useReadUserGasBudget.ts"
import { getUser } from "#src/state/user.ts"

const colorMap: Record<number, ClassValue> = {
    0: "text-error animate-pulse",
    1: "text-warning/60",
    2: "text-warning",
    3: "text-success/80",
    4: "text-success",
}

/**
 * Maps each battery health level to the corresponding Phosphor Icon component.
 */
const batteryIconStates: Record<number, Icon> = {
    0: BatteryWarningIcon,
    1: BatteryLowIcon,
    2: BatteryMediumIcon,
    3: BatteryHighIcon,
    4: BatteryFullIcon,
}

export const UserGasBudgetIndicator = () => {
    const user = getUser()
    const {
        data: { batteryHealth, batteryPct } = {},
        isLoading,
    } = useReadUserGasBudget(user?.address)

    if (isLoading || batteryHealth === undefined)
        return <SpinnerIcon weight="bold" className="text-lg mr-1 dark:opacity-60 motion-safe:animate-[spin_2s_linear_infinite]" />

    const BatteryIcon = batteryIconStates[batteryHealth]
    const colorClass = colorMap[batteryHealth]

    return (
        <button title={`${batteryPct}%`} type="button" aria-label={"gas budget"} className="dark:opacity-60">
            <BatteryIcon weight="bold" className={cx(colorClass, "text-lg", "mr-1")} />
        </button>
    )
}
