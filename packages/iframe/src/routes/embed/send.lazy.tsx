import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { type Address, isAddress } from "viem"
import AddressSelector from "../../components/interface/send-tx/AddressSelector"
import SendBalanceTracker from "../../components/interface/send-tx/SendBalanceTracker"
import SendButttons from "../../components/interface/send-tx/SendButtons"
import { publicClientAtom } from "../../state/publicClient"
import { userAtom } from "../../state/user"

export const Route = createLazyFileRoute("/embed/send")({
    component: Send,
})

function Send() {
    const user = useAtomValue(userAtom)
    const publicClient = useAtomValue(publicClientAtom)

    // user's happy balance, will be moved to a wagmi script that handles this
    const [happyBalance, setHappyBalance] = useState<bigint | undefined>(undefined)

    // address to send $HAPPY to
    const [targetAddress, setTargetAddress] = useState<Address | string | undefined>(undefined)
    // amount to send
    const [sendValue, setSendValue] = useState<string | undefined>(undefined)
    // is there a tx in progress currently
    const [inProgress, setInProgress] = useState(false)

    const getBalance = useCallback(async () => {
        if (user) {
            return await publicClient.getBalance({
                address: user?.address,
            })
        }
    }, [user, publicClient])

    useEffect(() => {
        const fetchBalance = async () => {
            const balance = await getBalance()
            setHappyBalance(balance)
        }

        if (user) {
            fetchBalance()
        }
    }, [user, getBalance])

    return (
        <div className="relative flex flex-col w-full h-full items-center justify-between">
            <div className="flex flex-col w-full h-full items-center justify-start">
                <AddressSelector targetAddress={targetAddress} setTargetAddress={setTargetAddress} />
                {/* appears when target address has been confirmed */}
                {targetAddress !== undefined && isAddress(targetAddress) && (
                    <SendBalanceTracker balance={happyBalance} sendValue={sendValue} setSendValue={setSendValue} />
                )}
            </div>

            <SendButttons sendValue={sendValue} targetAddress={targetAddress} setInProgress={setInProgress} />

            {/* Overlay when inProgress is true */}
            {inProgress && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
                    <span className="text-white text-xl font-bold">🤠 Transaction in progress 🤠</span>
                </div>
            )}
        </div>
    )
}
