import { SpinnerIcon } from "@phosphor-icons/react"

interface BalanceDisplayProps {
    isLoading: boolean
    balance: string | undefined
}

/**
 * Displays an ERC-20 token balance information with loading and error states.
 * Shows a loading spinner when data is being fetched,
 * the formatted balance when available, or an error icon when balance cannot be loaded.
 *
 * @param isLoading - Whether the balance data is currently being fetched
 * @param truncatedBalance - Formatted balance string truncated to 4 decimal places, undefined if not available
 */

export const BalanceDisplay = ({ isLoading, balance }: BalanceDisplayProps) => {
    if (isLoading && balance !== undefined) {
        return <SpinnerIcon className="animate-spin" size="1.25em" />
    }

    if (balance) {
        return <span className="font-semibold text-sm truncate">{balance}</span>
    }

    return (
        <span aria-label="Unable to load token balance" role="img">
            ⚠️
        </span>
    )
}
