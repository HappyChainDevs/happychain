import { convertToViemChain } from "@happychain/sdk-shared"
import { happyChainSepolia } from "@happychain/sdk-shared/lib/chains"
import { createLazyFileRoute, useLocation } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { type Address, formatEther, isAddress } from "viem"
import AddressSelector from "../../components/interface/send-tx/AddressSelector"
import SendBalanceTracker from "../../components/interface/send-tx/SendBalanceTracker"
import SendTransactionSummary from "../../components/interface/send-tx/SendTransactionSummary"
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
    const [targetAddress, setTargetAddress] = useState<string | undefined>(undefined)
    // amount to send
    const [sendValue, setSendValue] = useState<string | undefined>(undefined)
    // amount confirmed
    const [amountConfirmed, setAmountConfirmed] = useState<boolean>(false)

    const trySend = useCallback(async () => {
        try {
            if (user && happyBalance && sendValue && targetAddress && walletClient) {
                const _txPromise = await walletClient.sendTransaction({
                    account: user.address,
                    to: targetAddress as Address,
                    value: BigInt(sendValue), // wrong value - becomes very very small
                    chain: convertToViemChain(happyChainSepolia),
                })
            }
        } catch (error) {
            console.warn(error)
        }
    }, [user, happyBalance, targetAddress, sendValue, walletClient])

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
        <div className="flex flex-col w-full h-full">
            <AddressSelector targetAddress={targetAddress} setTargetAddress={setTargetAddress} />
            {/* appears when target address has been confirmed */}
            {targetAddress !== undefined && isAddress(targetAddress) && (
                <SendBalanceTracker
                    balance={happyBalance}
                    sendValue={sendValue}
                    setSendValue={setSendValue}
                    setAmountConfirmed={setAmountConfirmed}
                />
            )}
            {/* appears when amount has been confirmed */}
            {sendValue && amountConfirmed && (
                <SendTransactionSummary
                    targetAddress={targetAddress as Address}
                    sendValue={sendValue as string}
                    sendFn={trySend}
                />
            )}
        </div>
    )
}
