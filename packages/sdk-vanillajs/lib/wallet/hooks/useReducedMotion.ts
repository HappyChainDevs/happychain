import { useSyncExternalStore } from "preact/compat"

export function useReducedMotion(): boolean {
    const prefersReducedMotion = useSyncExternalStore(
        (callback: () => void) => {
            window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", callback)
            return () => window.matchMedia("(prefers-reduced-motion: reduce)").removeEventListener("change", callback)
        },
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches === true,
    )
    return prefersReducedMotion
}
