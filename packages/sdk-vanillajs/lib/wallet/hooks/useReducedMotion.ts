import { useSyncExternalStore } from "preact/compat"

let prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches === true

const subscribers = new Set<() => void>()

function getPrefersReducedMotion() {
    return prefersReducedMotion
}
function subscribe(callback: () => void) {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
}

window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (evt) => {
    prefersReducedMotion = evt.matches
    subscribers.forEach((callback) => callback())
})

export function useReducedMotion(): boolean {
    const prefersReducedMotion = useSyncExternalStore(subscribe, getPrefersReducedMotion)
    return prefersReducedMotion
}
