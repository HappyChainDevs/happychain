import { atom, useAtom } from "jotai"
import type { Address } from "viem"

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
export const useHappySendOptions = () => {
    const [sendValue, setSendValue] = useAtom(sendValueAtom)
    const [targetAddress, setTargetAddress] = useAtom(targetAddressAtom)
    const [balanceExceeded, setBalanceExceeded] = useAtom(balanceExceededAtom)

    return {
        sendValue,
        setSendValue,
        targetAddress,
        setTargetAddress,
        balanceExceeded,
        setBalanceExceeded,
    }
}
