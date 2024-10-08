import { useCallback, useState } from "preact/hooks"
import { createRequests } from "../helpers/requests"

const { requestPermissions, revokePermissions } = createRequests({ rdns: "tech.happy" })

const userRejectionErrorCode = 4001

export function useConnection() {
    const [connecting, setConnecting] = useState(false)

    const connect = useCallback(async () => {
        try {
            setConnecting(true)
            await requestPermissions()
        } catch (e) {
            if (e instanceof Error) {
                // don't need to throw every time they reject
                if ("code" in e && e.code === userRejectionErrorCode) {
                    return
                }

                console.error(e)
            }
        } finally {
            setConnecting(false)
        }
    }, [])

    const disconnect = useCallback(async () => {
        try {
            setConnecting(true)
            await revokePermissions()
        } finally {
            setConnecting(false)
        }
    }, [])

    return { connect, disconnect, connecting }
}
