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

/**
 * Controls the visibility of the Import Tokens dialog.
 */
export const importTokensDialogVisibilityAtom = atom(false)

/**
 * Atoms to help toggle visibility of permissions + log out views.
 */
export const secondaryMenuVisibilityAtom = atom(false)
export const dialogLogOutConfirmationVisibilityAtom = atom(false)
export const removeTokensMenuVisibilityAtom = atom(false)
