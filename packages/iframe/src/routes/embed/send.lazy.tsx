import { convertToViemChain } from "@happychain/sdk-shared"
import { happyChainSepolia } from "@happychain/sdk-shared/lib/chains"
import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { type Address, isAddress, parseEther } from "viem"
import AddressSelector from "../../components/interface/send-tx/AddressSelector"
import SendBalanceTracker from "../../components/interface/send-tx/SendBalanceTracker"
import StepButtonRow from "../../components/interface/send-tx/StepButtonRow"
import { publicClientAtom } from "../../state/publicClient"
import { userAtom } from "../../state/user"
import { walletClientAtom } from "../../state/walletClient"

export const Route = createLazyFileRoute("/embed/send")({
    component: Send,
})

function Send() {
    const user = useAtomValue(userAtom)
    const publicClient = useAtomValue(publicClientAtom)
    const walletClient = useAtomValue(walletClientAtom)

    // user's happy balance, will be moved to a wagmi script that handles this
    const [happyBalance, setHappyBalance] = useState<bigint | undefined>(undefined)

    // address to send $HAPPY to
    const [targetAddress, setTargetAddress] = useState<Address | undefined>(undefined)
    // amount to send
    const [sendValue, setSendValue] = useState<string | undefined>(undefined)

    const _trySend = useCallback(async () => {
        try {
            if (user && sendValue && targetAddress && walletClient) {
                const _txPromise = await walletClient.sendTransaction({
                    account: user.address,
                    to: targetAddress as Address,
                    value: parseEther(sendValue),
                    chain: convertToViemChain(happyChainSepolia),
                })
            }
        } catch (error) {
            console.warn(error)
        }
    }, [user, targetAddress, sendValue, walletClient])

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
        <div className="flex flex-col w-full h-full items-center justify-between">
            <div className="flex flex-col w-full h-full items-center justify-start">
                <AddressSelector targetAddress={targetAddress} setTargetAddress={setTargetAddress} />

                {/* appears when target address has been confirmed */}
                {targetAddress !== undefined && isAddress(targetAddress) && (
                    <SendBalanceTracker balance={happyBalance} sendValue={sendValue} setSendValue={setSendValue} />
                )}
            </div>

            <StepButtonRow sendValue={sendValue} targetAddress={targetAddress} />
        </div>
    )
}
