import { useAtom, useAtomValue } from "jotai"
import { useEffect } from "react"
import { useBalance } from "wagmi"
import { walletOpenSignalAtom } from "#src/state/interfaceState.ts"
import { userAtom } from "#src/state/user"
import { formatUserBalance } from "#src/utils/formatUserBalance"

export const HappyBalance = () => {
    const user = useAtomValue(userAtom)
    const { data: balance, refetch } = useBalance({
        address: user?.address,
        query: { enabled: !!user?.address },
    })
    const formattedBalance = formatUserBalance(balance?.value)
    const [walletOpenSignal, setWalletOpenSignal] = useAtom(walletOpenSignalAtom)

    useEffect(() => {
        if (!walletOpenSignal) return
        void refetch().then(() => setWalletOpenSignal(false))
    }, [refetch, walletOpenSignal, setWalletOpenSignal])

    return (
        <div className="mx-auto">
            <p className="gap-2 text-3xl items-center leading-none flex tabular-nums">
                <span className="font-bold">{formattedBalance}</span>
                <span className="text-[0.675em] font-medium">$HAPPY</span>
            </p>
        </div>
    )
}
