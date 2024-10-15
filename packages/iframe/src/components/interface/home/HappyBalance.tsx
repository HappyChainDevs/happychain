import { useAtomValue } from "jotai"
import { formatEther } from "viem"
import { useBalance } from "wagmi"
import { userAtom } from "../../state/user"

const HappyBalance = () => {
    const user = useAtomValue(userAtom)

    const { data: balance } = useBalance({ address: user?.address, query: { refetchInterval: 10000 } })

    // if user is undefined, it displays a loading skeleton
    const truncatedBalance = balance ? (
        (Math.floor(Number.parseFloat(formatEther(balance.value)) * 1000) / 1000).toString()
    ) : (
        <div className="animate-pulse">
            <div className="rounded-full bg-slate-500 h-4 w-10" />
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
