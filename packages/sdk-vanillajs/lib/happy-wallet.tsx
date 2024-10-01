/** @jsxImportSource preact */
import { AuthState, config } from "@happychain/sdk-shared"
import { clsx } from "clsx"
import { useEffect, useState } from "preact/hooks"
import cssStyles from "./happy-wallet.css?inline"
import { onAuthStateUpdate, onModalUpdate } from "./happyProvider/initialize"

function filterUndefinedValues(obj: { [k: string]: string | undefined }): { [k: string]: string } {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as { [k: string]: string }
}

function onErrorHandler() {
    console.error("HappyChain SDK failed to initialize")
}

export function HappyWallet({ windowId, chain, rpcUrl }: { windowId: string; chain: string; rpcUrl: string }) {
    const [authState, setAuthState] = useState(AuthState.Connecting)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => onModalUpdate(setIsOpen), [])
    useEffect(() => onAuthStateUpdate(setAuthState), [])
    useEffect(() => {
        const openHandler = () => isOpen && setIsOpen(false)
        document.addEventListener("click", openHandler)
        return () => document.removeEventListener("click", openHandler)
    }, [isOpen])

    const url = new URL("embed", config.iframePath)

    const searchParams = new URLSearchParams(
        filterUndefinedValues({
            windowId: windowId,
            chain: chain,
            "rpc-urls": rpcUrl,
        }),
    ).toString()

    const connected = authState === AuthState.Connected
    const connecting = authState === AuthState.Connecting
    const disconnected = authState === AuthState.Disconnected

    const classes = {
        // never open while connecting
        open: isOpen && !connecting,
        closed: !isOpen || connecting,

        connected: connected,
        disconnected: disconnected,
        connecting: connecting,

        // show login modal mode when connecting or disconnected
        modal: !connected && isOpen,
    }

    return (
        <>
            <style>{cssStyles}</style>
            <iframe
                title="happy-iframe"
                onError={onErrorHandler}
                src={`${url.href}?${searchParams}`}
                className={clsx(classes)}
                style={{ border: "none" }}
                allow="clipboard-read; clipboard-write"
            />
        </>
    )
}
