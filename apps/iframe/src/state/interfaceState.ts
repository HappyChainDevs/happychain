import { atom } from "jotai"

export enum ContentType {
    TOKENS = "Tokens",
    GAMES = "Games",
    ACTIVITY = "Activity",
}

/**
 * Atom to help toggle between view states in the
 * landing page of the wallet iframe component.
 */
export const walletInfoViewAtom = atom<ContentType>(ContentType.TOKENS)
