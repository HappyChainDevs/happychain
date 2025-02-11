import { type Atom, useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"

type AsyncOperationState<T> = {
    data: T | undefined
    loading: boolean
    error: Error | undefined
}

/**
 * Custom hook for managing async operations with Jotai atoms that return Promises.
 * Handles loading states, errors, and data processing.
 *
 * @template T Type wrapped in the atom's Promise
 * @template R Type of the processed result (defaults to T if no operation)
 *
 * @param asyncAtom - Jotai atom returning Promise<T | undefined>
 * @param operation - Optional processor function (T => Promise<R>)
 *
 * @returns Object containing:
 * - data: The processed result (R | undefined)
 * - loading: boolean for operation status
 * - error: Error object if failed
 * - reload: Function to retry operation
 *
 * @example
 * const { data, loading } = useAsyncOperation(myAtom, async (val) => process(val))
 */
export function useAsyncOperation<T, R>(
    asyncAtom: Atom<Promise<T | undefined>>,
    operation?: (client: T) => Promise<R | undefined>,
) {
    const [state, setState] = useState<AsyncOperationState<R>>({
        data: undefined,
        loading: true,
        error: undefined,
    })

    const atomValue = useAtomValue(asyncAtom)

    const executeOperation = useCallback(async () => {
        // Don't set loading if we're already loading
        setState((prev) => (prev.loading ? prev : { ...prev, loading: true }))

        try {
            const client = atomValue

            // Early return pattern for cleaner flow
            if (!client) {
                return setState({
                    data: undefined,
                    loading: false,
                    error: new Error("Client not initialized"),
                })
            }

            // Single setState path for both cases
            setState({
                data: operation ? await operation(client) : (client as unknown as R),
                loading: false,
                error: undefined,
            })
        } catch (error) {
            // Type guard for better error handling
            const errorMessage = error instanceof Error ? error : new Error("Unknown error occurred")

            setState({
                data: undefined,
                loading: false,
                error: errorMessage,
            })
        }
    }, [atomValue, operation])

    // Cleanup on unmount
    useEffect(() => {
        let mounted = true

        void (async () => {
            try {
                await executeOperation()
            } catch (error) {
                if (mounted) {
                    setState((prev) => ({
                        ...prev,
                        loading: false,
                        error: error as Error,
                    }))
                }
            }
        })()

        return () => {
            mounted = false
        }
    }, [executeOperation])

    return {
        ...state,
        reload: executeOperation,
    }
}
