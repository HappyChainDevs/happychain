import { accessorsFromAtom } from "@happy.tech/common"
import { atom } from "jotai"
import type { Address } from "viem"

export enum ContentType {
    TOKENS = "Tokens",
    GAMES = "Games",
    ACTIVITY = "Activity",
    FAUCET = "Faucet",
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

/**
 * Atom to store a temporary boolean state for when user
 * opens the wallet so as to signal to wagmi's useBalance
 * hook to refetch the user's $HAPPY balance info.
 */
export const walletOpenSignalAtom = atom(false)
export const { getValue: getWalletOpenSignal, setValue: setWalletOpenSignal } = accessorsFromAtom(walletOpenSignalAtom)

/**
 * Stores **ADDRESSES** (not keys) for which session keys need to be revoked. This is not
 * an atom because it never needs to be used reactively — it's simply a way to pass data
 * from the permission management UI to the route transition handler (in `__root.tsx`).
 */
export const revokedSessionKeys = new Set<Address>()
