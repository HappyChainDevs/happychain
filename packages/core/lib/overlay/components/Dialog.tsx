/** @jsxImportSource preact */
import { animate } from "motion"
import { type PropsWithChildren, useEffect, useRef } from "preact/compat"
import { CloseIcon } from "./icons/CloseIcon"

export const Dialog = ({ children, isOpen, onClose }: PropsWithChildren<{ onClose: () => void; isOpen: boolean }>) => {
    const bg = useRef(null)

    useEffect(() => {
        if (!bg.current) return
        const keyframes = !isOpen ? { opacity: 0, display: "none" } : { opacity: 1, display: "flex" }
        animate(bg.current, keyframes, { duration: 0.15 })
    }, [isOpen])

    return (
        <div className="dialog-background" ref={bg}>
            <dialog open className="dialog">
                <button type="button" onClick={onClose} className="dialog-close">
                    <CloseIcon />
                </button>

                {children}
            </dialog>
        </div>
    )
}
