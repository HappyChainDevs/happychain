import { CircleNotch } from "@phosphor-icons/react"
import { formatEther } from "viem"

interface HappyBalanceProps {
    balance: bigint | undefined
}

const HappyBalance = ({ balance }: HappyBalanceProps) => {
    const truncatedBalance = balance ? (
        (Math.floor(Number.parseFloat(formatEther(balance)) * 1000) / 1000).toString()
    ) : (
        <div className="animate-spin">
            <CircleNotch />
        </div>
    )

    return (
        <div className="flex flex-row w-full items-center justify-between">
            <p className="text-lg">$HAPPY</p>
            <div className="flex flex-col items-center">
                <div className="text-2xl">{truncatedBalance}</div>
            </div>
        </div>
    )
}

export default HappyBalance
