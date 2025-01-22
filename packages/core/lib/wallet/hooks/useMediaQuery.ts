import { useSyncExternalStore } from "preact/compat"

export function useMediaQuery(query: string) {
    return useSyncExternalStore(
        (callback: () => void) => {
            window.matchMedia(query).addEventListener("change", callback)
            return () => window.matchMedia(query).removeEventListener("change", callback)
        },
        () => window.matchMedia(query).matches === true,
    )
}
