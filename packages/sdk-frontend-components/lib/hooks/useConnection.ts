import { useCallback, useState } from "preact/hooks"
import { createRequests } from "../helpers/requests"

const { requestPermissions, revokePermissions } = createRequests({ rdns: "tech.happy" })

export function useConnection() {
    const [connecting, setConnecting] = useState(false)

    const connect = useCallback(async () => {
        try {
            setConnecting(true)
            await requestPermissions()
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
