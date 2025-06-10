import { useCallback, useState } from "react"

export function useAbortController() {
    const [controller, setController] = useState(() => new AbortController())

    const reset = useCallback(() => {
        controller.abort()
        setController(new AbortController())
    }, [controller])

    const abort = useCallback(() => controller.abort(), [controller])

    return {
        signal: controller.signal,
        abort,
        reset,
        isAborted: controller.signal.aborted,
    }
}
