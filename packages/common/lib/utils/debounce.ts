/**
 * Simple debounce helper to avoid multiple emits when authState+user+permissions all change at once
 */
export function debounce<T>(callback: (_arg: T) => void, time: number) {
    let interval: ReturnType<typeof setTimeout> | undefined = undefined
    return (arg: T) => {
        clearTimeout(interval)
        interval = setTimeout(() => {
            interval = undefined
            callback(arg)
        }, time)
    }
}
