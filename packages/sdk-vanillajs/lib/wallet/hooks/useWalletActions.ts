import { useCallback } from "preact/hooks"
import { useIsOpen } from "./useIsOpen"

export function useWalletActions() {
    const { isOpen, setIsOpen } = useIsOpen()

    const toggleWalletOpen = useCallback(
        (e: MouseEvent | KeyboardEvent) => {
            // Mouse events toggle visibility. In practice this will only open however
            // since any mouse events inside this div will be swallowed by the iframe,
            if (e instanceof MouseEvent) {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen((opn) => !opn)
            }

            // Enter key opens the wallet (if focused)
            if (e instanceof KeyboardEvent && !isOpen && e.code === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(true)
            }

            // Escape key closes the wallet (if focused)
            if (e instanceof KeyboardEvent && isOpen && e.code === "Escape") {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false)
            }
        },
        [isOpen, setIsOpen],
    )

    return { toggleWalletOpen }
}
