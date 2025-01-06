import type { Address } from "abitype"
import { atom } from "jotai"

// ======================================== <send.lazy.tsx> ========================================

/**
 * State variables used in send.lazy.tsx for managing the state of the send page.
 * This includes variables related to user input, transaction details, and UI state.
 */

// `<AddressSelector />` input value - address to send $HAPPY to
const targetAddress = atom<Address | string | undefined>(undefined)

// `<SendInput />` input value - $HAPPY amount to be sent
const sendValue = atom<string | undefined>(undefined)

// boolean to check if inputted send amount is higher than user's balance
const balanceExceeded = atom<boolean>(false)

export { targetAddress, sendValue, balanceExceeded }
