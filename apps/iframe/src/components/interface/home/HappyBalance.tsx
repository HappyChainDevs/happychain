import { formatUserBalance } from "@happy.tech/wallet-common"
import { useAtomValue } from "jotai"
import { useBalance } from "wagmi"
import { userAtom } from "#src/state/user"

const HappyBalance = () => {
    const user = useAtomValue(userAtom)
    const { data: balance } = useBalance({ address: user?.address })
    const formattedBalance = formatUserBalance(balance?.value)

    return (
        <div className="flex flex-col gap-0.5 w-full items-center justify-between">
            <p className="gap-[1ex] flex tabular-nums items-baseline">
                <span className="text-3xl font-bold">{formattedBalance}</span>
                <span className="text-sm font-medium">$HAPPY</span>
            </p>
        </div>
    )
}

export default HappyBalance
