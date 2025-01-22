/**
 * Creates a debounced function which is will not be called until specified \<delay\>
 * milliseconds have passed since the last call.
 *
 * For more info: {@link https://css-tricks.com/debouncing-throttling-explained-examples/}
 */
export function debounce<T>(callback: (_arg: T) => void, delay: number) {
    let interval: ReturnType<typeof setTimeout> | undefined
    return (arg: T) => {
        clearTimeout(interval)
        interval = setTimeout(() => {
            interval = undefined
            callback(arg)
        }, delay)
    }
}
