import type { Address } from "abitype"
import { atom } from "jotai"

// ======================================== <send.lazy.tsx> ========================================

/**
 * State variables used in send.lazy.tsx for managing the state of the send page.
 * This includes variables related to user input, transaction details, and UI state.
 */

// `<AddressSelector />` input value - address to send $HAPPY to
export const targetAddressAtom = atom<Address | string | undefined>(undefined)

// `<SendInput />` input value - $HAPPY amount to be sent
export const sendValueAtom = atom<string>("")

// boolean to check if input send amount is higher than user's balance
export const balanceExceededAtom = atom<boolean>(false)
