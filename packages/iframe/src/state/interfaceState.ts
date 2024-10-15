import { useNavigate } from "@tanstack/react-router"
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
const baseTrackSendAtom = atom<boolean>(false)

/**
 * Helper atom to track the status of the send atom and alert the
 * user if there's a transaction being sent as the user navigates away.
 */
export const trackSendAtom = atom(
    (get) => get(baseTrackSendAtom), // Read function
    (
        get,
        set,
        { val, setShowModal }: { val?: boolean; setShowModal?: React.Dispatch<React.SetStateAction<boolean>> },
    ) => {
        const trackSend = get(baseTrackSendAtom)
        const navigate = useNavigate()

        if (trackSend) {
            // Show modal if a transaction is in flight and setter is the sent in param
            if (setShowModal) {
                setShowModal(true)
            }
            if (val) {
                set(baseTrackSendAtom, val)
            }
        } else {
            // Directly navigate to the embed route if no transaction
            navigate({ to: "/embed" })
        }
    },
)
