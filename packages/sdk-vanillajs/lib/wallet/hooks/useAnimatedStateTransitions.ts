import { animate, spring } from "motion"
import { useEffect, useRef } from "preact/hooks"
import { useBreakpoint } from "./useBreakpoint"
import { useIsOpen } from "./useIsOpen"
import { useReducedMotion } from "./useReducedMotion"

const mobile = {
    open: {
        // Could be done by settings --happy-open-xxxx in styles.css, but changed here to leave
        // flexibility for more advanced animations in the future
        height: ["var(--happy-closed-size)", "100vh"],
        width: ["var(--happy-closed-size)", "100vw"],
        transform: ["translateY(0)", "translateY(var(--wallet-offset-y))"],
    },
    closed: {
        height: [null, "var(--happy-closed-size)"],
        width: [null, "var(--happy-closed-size)"],
        transform: [null, "translateY(0)"],
    },
}

const desktop = {
    open: {
        height: ["var(--happy-closed-size)", "var(--happy-open-height)"],
        width: ["var(--happy-closed-size)", "var(--happy-open-width)"],
        transform: ["translateY(0)", "translateY(var(--wallet-offset-y))"],
    },
    closed: {
        height: [null, "var(--happy-closed-size)"],
        width: [null, "var(--happy-closed-size)"],
        transform: [null, "translateY(0)"],
    },
}

export function useAnimatedStateTransitions() {
    const { isOpen } = useIsOpen()

    const reduced = useReducedMotion()
    const isDesktop = useBreakpoint("md")

    const frame = useRef<HTMLDivElement>(null)
    const iframe = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        if (!frame.current || !iframe.current) return

        const target = isDesktop ? desktop : mobile

        const walletAnimation = isOpen ? target.open : target.closed

        const iframeAnimation = isOpen ? { opacity: [0, 1] } : { opacity: [null, 0] }

        animate(frame.current, walletAnimation, {
            height: { easing: reduced ? "linear" : spring() },
            width: { easing: reduced ? "linear" : spring() },
            duration: reduced ? 0 : 0.3,
        })
        animate(iframe.current, iframeAnimation, { duration: reduced ? 0 : 0.3 })
    }, [reduced, isOpen, isDesktop])

    return { frame, iframe }
}
