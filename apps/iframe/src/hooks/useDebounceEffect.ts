import { type DependencyList, useEffect, useRef } from "react"

/**
 * A custom hook that executes a callback function after a specified delay
 * when its dependencies change. If the dependencies change again before
 * the delay has elapsed, the timer is reset.
 *
 * @param fn - The callback function to execute after the delay.
 * @param deps - Array of dependencies that trigger the debounce timer.
 * @param delay - Time in milliseconds to wait before executing the callback.
 */
export const useDebounceEffect = (fn: () => void, deps: DependencyList, delay: number): void => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

    useEffect(() => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            fn()
            clearTimeout(timeoutRef.current)
        }, delay)
    }, [...deps, fn, delay])
}
