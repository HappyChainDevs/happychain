import { Format, type FormatNumberProps } from "@happy.tech/uikit-react"
import type { UseBalanceReturnType } from "wagmi"
import type { UseERC20BalanceReturnType } from "#src/hooks/useERC20Balance"

interface BalanceProps {
    status: UseBalanceReturnType["status"] | UseERC20BalanceReturnType["status"]
    value: FormatNumberProps["value"] | null
}
export const Balance = ({ status, value }: BalanceProps) => {
    if (status === "pending") return "..."
    if (status === "error") return "--.--"
    return <Format.Number value={typeof value !== "number" ? 0 : value} />
}
