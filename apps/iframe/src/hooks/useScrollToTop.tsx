import { useEffect, useRef } from "react"

/**
 * Hook that scrolls a ref element to the top when a condition is met.
 * @param shouldScroll - Boolean that triggers scrolling when true
 * @returns React ref to attach to the scrollable element
 */
export function useScrollToTop(shouldScroll: boolean): React.RefObject<HTMLElement | null> {
    const elementRef = useRef<HTMLElement>(null)

    useEffect(() => {
        if (shouldScroll && elementRef.current) {
            elementRef.current.scrollTo({
                top: 0,
                left: 0,
                behavior: "auto",
            })
        }
    }, [shouldScroll])

    return elementRef
}
