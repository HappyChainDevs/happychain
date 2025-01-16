import { useEffect, useRef } from "react"

export const useDebounceEffect = (fn: () => void, deps: React.DependencyList, delay: number): void => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

    useEffect(() => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            fn()
            clearTimeout(timeoutRef.current)
        }, delay)
    }, [...deps, fn, delay])
}
