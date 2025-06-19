import { EIP1193ErrorCodes } from "@happy.tech/wallet-common"
import { useCallback, useEffect, useState } from "preact/hooks"
import { closeWallet, connect as hcConnect, disconnect as hcDisconnect, openWallet } from "../functions"
import { internalProvider } from "../happyProvider"

export function useConnection() {
    const [connecting, setConnecting] = useState(false)

    /**
     * Resets the connecting state when wallet is closed.
     *
     * This ensures the badge doesn't get stuck showing "Connecting"
     * if the wallet is closed during a connection attempt. Affects:
     * - Button disabled state
     * - Label text ("Connect"/"Connecting"/user info)
     * - Click handler behavior
     */
    useEffect(() => {
        return internalProvider.onWalletVisibilityUpdate(({ isOpen }) => {
            if (!isOpen) {
                setConnecting(false)
            }
        })
    }, [])

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

    const close = useCallback(() => {
        if (connecting) setConnecting(false)
        closeWallet()
    }, [connecting])

    return { connect, disconnect, connecting, open, close }
}
