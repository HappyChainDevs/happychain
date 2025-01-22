import { useContext } from "preact/hooks"
import { IsOpenContext } from "../context/IsOpenContext"

export function useIsOpen() {
    const { isOpen, setIsOpen } = useContext(IsOpenContext)
    return { isOpen, setIsOpen }
}
