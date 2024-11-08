import { connect as hcConnect, disconnect as hcDisconnect } from "@happychain/js"
import { useCallback, useState } from "preact/hooks"

const userRejectionErrorCode = 4001

export function useConnection() {
    const [connecting, setConnecting] = useState(false)

    const connect = useCallback(async () => {
        try {
            setConnecting(true)
            await hcConnect()
        } catch (e) {
            console.log(e)
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
            await hcDisconnect()
        } finally {
            setConnecting(false)
        }
    }, [])

    return { connect, disconnect, connecting }
}
