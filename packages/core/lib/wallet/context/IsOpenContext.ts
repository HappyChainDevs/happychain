import { createContext } from "preact"
import { useEffect, useState } from "preact/hooks"
import { internalProvider } from "../../happyProvider"

export const IsOpenContext = createContext({
    isOpen: false,
    setIsOpen: (_open: boolean | ((_b: boolean) => boolean)): void => {},
})

export function useSetupIsOpenContext() {
    const [isOpen, internalSetIsOpen] = useState(false)

    // Syncs open state with iframe.
    useEffect(
        () =>
            internalProvider.onWalletVisibilityUpdate((state) => {
                internalSetIsOpen(state.isOpen)
            }),
        [],
    )

    // 'Click outside' closes the wallet
    // This simple approach allows clicks anywhere to close it,
    // however it is safe since any click inside the iframe will be captured
    // by the iframe itself and not bubble through.
    useEffect(() => {
        const openHandler = () => isOpen && internalProvider.displayWallet(false)
        document.addEventListener("click", openHandler)
        return () => document.removeEventListener("click", openHandler)
    }, [isOpen])

    return {
        isOpen,
        // Instead of setting the variable locally here we emit to the iframe
        // this pattern simplifies the isOpen setter since it only needs to respond to iframe events
        // and it allows us to hook into iframe-specific events, such as rejecting a handling request
        // in the happyProvider, which otherwise would not be available here
        setIsOpen: (_open: boolean | ((_b: boolean) => boolean)) => {
            const open = typeof _open === "boolean" ? _open : _open(isOpen)
            internalProvider.displayWallet(open)
        },
    }
}
