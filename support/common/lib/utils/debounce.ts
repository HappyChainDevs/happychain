/**
 * Creates a debounced function which will not be called until the
 * specified {@link delay} milliseconds have passed since the last call.
 *
 * For more info: {@link https://css-tricks.com/debouncing-throttling-explained-examples/}
 */
export function debounce<Args extends unknown[]>(
    callback: (...args: Args) => void,
    delay = 100,
): (...args: Args) => void {
    let interval: ReturnType<typeof setTimeout> | undefined
    return (...args: Args) => {
        clearTimeout(interval)
        interval = setTimeout(() => {
            interval = undefined
            callback(...args)
        }, delay)
    }
}
