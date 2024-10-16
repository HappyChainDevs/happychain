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

/** Base atom to track whether a transaction is being sent */
export const trackSendAtom = atom<boolean>(false)
