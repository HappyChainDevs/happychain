/**
 * Creates a throttled function which is executed at most, every <delay> milliseconds.
 * Executes on the leading edge of the timeout (immediately), and drops subsequent calls
 * until the timeout has ended.
 *
 * default delay is 16ms, which roughly corresponds to 60 FPS
 *
 * For more info: {@link https://css-tricks.com/debouncing-throttling-explained-examples/}
 */
export function throttle<T, K>(fn: (a: T) => K, delay = 16) {
    let throttle: ReturnType<typeof setTimeout> | undefined
    return (args: T) => {
        if (throttle) return
        fn(args)
        throttle = setTimeout(() => {
            throttle = undefined
        }, delay)
    }
}
