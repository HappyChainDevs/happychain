// 8ms is roughly 120 FPS
export function throttle<T, K>(fn: (a: T) => K, delay = 8) {
    let throttle: ReturnType<typeof setTimeout> | undefined
    return (args: T) => {
        if (throttle) return

        throttle = setTimeout(() => {
            fn(args)
            throttle = undefined
        }, delay)

        fn(args)
    }
}
