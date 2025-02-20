import { formatUserBalance } from "@happy.tech/wallet-common"
import { useAtomValue } from "jotai"
import { useBalance } from "wagmi"
import { userAtom } from "#src/state/user"

export const HappyBalance = () => {
    const user = useAtomValue(userAtom)
    const { data: balance } = useBalance({ address: user?.address })
    const formattedBalance = formatUserBalance(balance?.value)

    return (
        <div className="mx-auto">
            <p className="gap-2 text-3xl items-center leading-none flex tabular-nums">
                <span className="font-bold">{formattedBalance}</span>
                <span className="text-[0.675em] font-medium">HAPPY</span>
            </p>
        </div>
    )
}
