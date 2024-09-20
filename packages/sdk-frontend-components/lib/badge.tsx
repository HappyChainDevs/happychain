import { useCallback, useEffect, useMemo, useState } from "react"
import { Animated } from "./components/Animated"
import { Button } from "./components/Button"
import { ConnectionError } from "./components/ConnectionError"
import { ConnectionStatus } from "./components/ConnectionStatus"
import { Logo } from "./components/Logo"
import { Styles } from "./components/Styles"
import { createRequests } from "./helpers/requests"

const noop = undefined

const { fetchAccounts, requestPermissions, revokePermissions, onAccountsChanged, providerInfo } = createRequests({
    rdns: "tech.happy",
})

export function Badge({ disableStyles = false }: { disableStyles?: boolean | string }) {
    const [accounts, setAccounts] = useState<`0x${string}`[]>([])
    const [initialized, setInitialized] = useState(false)
    const [errored, setErrored] = useState(false)

    const { connect, disconnect, connecting } = useConnection()

    useEffect(() => {
        async function init() {
            try {
                const _accounts = await fetchAccounts()
                setAccounts(_accounts)
                setInitialized(true)
            } catch (e) {
                console.error(e)
                setErrored(true)
            }
        }
        init()
    }, [])

    useEffect(() => {
        return onAccountsChanged(setAccounts)
    }, [])

    const connected = accounts.length > 0

    const onClick = useMemo(
        () => (!initialized || connecting ? noop : connected ? disconnect : connect),
        [connect, connected, disconnect, initialized, connecting],
    )
    const state = useMemo(
        () => (!initialized ? "initializing" : connecting ? "connecting" : connected ? "connected" : "disconnected"),
        [initialized, connecting, connected],
    )

    const provider = providerInfo()
    return (
        <div>
            {<Styles disableStyles={disableStyles} />}
            {errored || !provider ? (
                <ConnectionError />
            ) : (
                <Button
                    onClick={onClick}
                    disabled={!initialized || connecting}
                    className={!accounts.length ? `${state} animated` : state}
                >
                    <span>
                        <Logo info={provider} />
                        <Animated state={state}>
                            <ConnectionStatus initialized={initialized} connecting={connecting} accounts={accounts} />
                        </Animated>
                    </span>
                </Button>
            )}
        </div>
    )
}

function useConnection() {
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
