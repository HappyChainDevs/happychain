import { createContext } from "preact"
import { useEffect, useState } from "preact/hooks"
import { onModalUpdate } from "../../happyProvider/initialize"

export const IsOpenContext = createContext({
    isOpen: false,
    setIsOpen: (_open: boolean | ((_b: boolean) => boolean)): void => {},
})

export function useSetupIsOpenContext() {
    const [isOpen, setIsOpen] = useState(false)

    // Syncs open state with iframe.
    useEffect(() => onModalUpdate((state) => setIsOpen(state.isOpen)), [])

    // 'Click outside' closes the wallet
    // This simple approach allows clicks anywhere to close it,
    // however it is safe since any click inside the iframe will be captured
    // by the iframe itself and not bubble through.
    useEffect(() => {
        const openHandler = () => isOpen && setIsOpen(false)
        document.addEventListener("click", openHandler)
        return () => document.removeEventListener("click", openHandler)
    }, [isOpen])

    return { isOpen, setIsOpen }
}
