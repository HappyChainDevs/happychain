// 8ms is roughly 120 FPS
export function throttle<T, K>(fn: (a: T) => K, delay = 8) {
    let throttle: ReturnType<typeof setTimeout> | undefined
    return (args: T) => {
        if (throttle) {
            return
        } // you no enter

        throttle = setTimeout(() => {
            // tail it - and do one last ajax request
            fn(args)
            throttle = undefined
        }, delay)

        fn(args)
    }
}
