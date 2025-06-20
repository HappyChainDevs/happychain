import { EIP1193ErrorCodes } from "@happy.tech/wallet-common"
import { useCallback, useState } from "preact/hooks"
import { connect as hcConnect, disconnect as hcDisconnect, openWallet } from "../functions"

export function useConnection() {
    const [connecting, setConnecting] = useState(false)

    const connect = useCallback(async () => {
        try {
            setConnecting(true)
            await hcConnect()
        } catch (e) {
            // don't need to throw every time they reject
            if (e instanceof Error && "code" in e && e.code === EIP1193ErrorCodes.UserRejectedRequest) {
                return
            }

            console.error(e)
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

    const open = useCallback(() => {
        openWallet()
    }, [])

    return { connect, disconnect, connecting, open }
}
