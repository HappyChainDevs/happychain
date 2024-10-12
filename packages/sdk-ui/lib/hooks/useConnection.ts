import { connect as ogConnect, disconnect as ogDisconnect, onUserUpdate } from "@happychain/js"
import { useCallback, useEffect, useState } from "preact/hooks"

const userRejectionErrorCode = 4001

export function useConnection() {
    const [connecting, setConnecting] = useState(false)

    // TODO: remove when initial ogConnect properly resolves
    // when logging in with metamask
    // useEffect(() => onUserUpdate((_user) => setConnecting(false)), [])

    const connect = useCallback(async () => {
        try {
            setConnecting(true)
            await ogConnect()
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
            await ogDisconnect()
        } finally {
            setConnecting(false)
        }
    }, [])

    return { connect, disconnect, connecting }
}
