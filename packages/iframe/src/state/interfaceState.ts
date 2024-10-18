import { accessorsFromAtom } from "@happychain/common"
import { atom } from "jotai"

export enum ContentType {
    TOKENS = "Tokens",
    GAMES = "Games",
    ACTIVITY = "Activity",
}

/**
 * Collection of atoms that track different view / button states across
 * the iframe UI. The idea is to use jotai to escape "provider hell" and create
 * a more simplistic API for (minimal render) state management.
 */

/**
 * Atom to help toggle between view states in
 * landing page of the wallet iframe component.
 * */
export const walletInfoViewAtom = atom<ContentType>(ContentType.TOKENS)

// ------------------------------------------------------------------------------------

/**
 * Atom that tracks whether a transaction is being sent
 * The atom state should be true when {@link PendingTxsAtom} is populated with a
 * transaction hash, indicating that there is a tx being confirmed.
 * The 3 states we toggle between are:
 * - `true`: There is a pending tx being tracked
 * - `false`: No pending txs, "safe" to send a new tx
 * - `undefined`: There is a pending tx, but user has chosen to navigate away
 *    from the Send page.
 */
export const transactionFromSendPageAtom = atom<boolean | undefined>(false)

export const { getValue: getTxSendState, setValue: setTxSendState } = accessorsFromAtom(transactionFromSendPageAtom)
