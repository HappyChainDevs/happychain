import { animate, spring } from "motion"
import { useEffect, useRef } from "preact/hooks"
import { useIsOpen } from "./useIsOpen"

export function useAnimatedStateTransitions() {
    const { isOpen } = useIsOpen()

    const frame = useRef<HTMLDivElement>(null)
    const iframe = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        if (!frame.current || !iframe.current) return

        const walletAnimation = isOpen
            ? {
                  height: ["var(--happy-closed-height)", "var(--happy-open-height)"],
                  width: ["var(--happy-closed-width)", "var(--happy-open-width)"],
                  transform: ["translateY(0)", "translateY(var(--wallet-offset-y))"],
              }
            : {
                  height: [null, "var(--happy-closed-height)"],
                  width: [null, "var(--happy-closed-width)"],
                  transform: [null, "translateY(0)"],
              }

        const iframeAnimation = isOpen ? { opacity: [0, 1] } : { opacity: [null, 0] }

        animate(frame.current, walletAnimation, {
            height: { easing: spring() },
            width: { easing: spring() },
        })
        animate(iframe.current, iframeAnimation)
    }, [isOpen])

    return { frame, iframe }
}
