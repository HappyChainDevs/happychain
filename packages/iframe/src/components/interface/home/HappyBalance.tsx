import { useAtomValue } from "jotai"
import { formatEther } from "viem"
import { useBalance } from "wagmi"
import { userAtom } from "../../../state/user"

const HappyBalance = () => {
    const user = useAtomValue(userAtom)

    const { data: balance } = useBalance({ address: user?.address })

    const truncatedBalance = balance
        ? (Math.floor(Number.parseFloat(formatEther(balance.value)) * 1000) / 1000).toString()
        : "0.0"

    return (
        <div className="flex flex-row w-full items-center justify-between">
            <p className="text-lg">$HAPPY</p>
            <div className="flex flex-col items-center">
                <p className="text-2xl">{truncatedBalance}</p>
            </div>
        </div>
    )
}

export default HappyBalance
