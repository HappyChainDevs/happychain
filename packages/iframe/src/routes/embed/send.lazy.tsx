import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { type Address, isAddress } from "viem"
import AddressSelector from "../../components/interface/send-tx/AddressSelector"
import SendButtons from "../../components/interface/send-tx/SendButtons"
import SendInput from "../../components/interface/send-tx/SendInput"
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
                    <SendInput balance={happyBalance} sendValue={sendValue} setSendValue={setSendValue} />
                )}
            </div>

            <SendButtons sendValue={sendValue} targetAddress={targetAddress} />
        </div>
    )
}
