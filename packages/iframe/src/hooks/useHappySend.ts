import { atom, useAtom } from "jotai"
import { useCallback } from "react"
import { type Address, parseEther } from "viem"
import { useSendTransaction } from "wagmi"

// `<AddressSelector />` input value - address to send $HAPPY to
const targetAddressAtom = atom<Address | string | undefined>(undefined)

// `<SendInput />` input value - $HAPPY amount to be sent
const sendValueAtom = atom<string>("")

// boolean to check if input send amount is higher than user's balance
const balanceExceededAtom = atom<boolean>(false)

/**
 * Hook for managing token send functionality state across components.
 *
 * This hook provides access to and control over three key pieces of state
 * within the `send.lazy.tsx` page components:
 * - The recipient's address for the token transfer
 * - The amount of $HAPPY tokens to send
 * - A flag indicating whether the send amount exceeds the user's balance
 */
export const useHappySend = () => {
    const [sendValue, setSendValue] = useAtom(sendValueAtom)
    const [targetAddress, setTargetAddress] = useAtom(targetAddressAtom)
    const [balanceExceeded, setBalanceExceeded] = useAtom(balanceExceededAtom)

    const {
        sendTransaction,
        isPending: isSendPending,
        isSuccess: isSendSucess,
        isError: isSendError,
    } = useSendTransaction()

    const submitSend = useCallback(() => {
        if (targetAddress && sendValue) {
            void sendTransaction({
                to: targetAddress as Address,
                value: parseEther(sendValue),
            })
        }
    }, [sendTransaction, sendValue, targetAddress])

    return {
        // state + setters
        sendValue,
        setSendValue,
        targetAddress,
        setTargetAddress,
        balanceExceeded,
        setBalanceExceeded,

        // wagmi fn / fields
        submitSend,
        isSendPending,
        isSendSucess,
        isSendError,
    }
}
