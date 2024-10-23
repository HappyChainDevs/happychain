import { formatUserBalance } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useBalance } from "wagmi"
import { userAtom } from "../../../state/user"

const HappyBalance = () => {
    const user = useAtomValue(userAtom)

    const { data: balance } = useBalance({ address: user?.address })

    const formattedBalance = formatUserBalance(balance?.value)

    return (
        <div className="flex flex-row w-full items-center justify-between">
            <p className="text-lg">$HAPPY</p>
            <div className="flex flex-col items-center">
                <p className="text-2xl">{formattedBalance}</p>
            </div>
        </div>
    )
}

export default HappyBalance
