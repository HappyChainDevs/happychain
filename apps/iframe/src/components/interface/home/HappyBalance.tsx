import { useAtom, useAtomValue } from "jotai"
import { useEffect } from "react"
import { useBalance } from "wagmi"
import { FieldLoader } from "#src/components/loaders/FieldLoader"
import { walletOpenSignalAtom } from "#src/state/interfaceState"
import { userAtom } from "#src/state/user"
import { formatUserBalance } from "#src/utils/formatUserBalance"

export const HappyBalance = () => {
    const user = useAtomValue(userAtom)
    const {
        data: balance,
        isLoading,
        refetch,
    } = useBalance({
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
            <span className="gap-2 text-3xl items-center leading-none flex tabular-nums">
                {isLoading ? <FieldLoader size="md" /> : <span className="font-bold">{formattedBalance}</span>}
                <span className="text-[0.675em] font-medium">$HAPPY</span>
            </span>
        </div>
    )
}
