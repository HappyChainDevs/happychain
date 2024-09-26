import type { HappyUser } from "@happychain/sdk-shared"
import { useEffect, useMemo, useState } from "preact/hooks"
import type { JSX } from "preact/jsx-runtime"
import { Animated } from "./components/Animated"
import { Button } from "./components/Button"
import { ConnectionError } from "./components/ConnectionError"
import { ConnectionStatus } from "./components/ConnectionStatus"
import { Logo } from "./components/Logo"
import { Styles } from "./components/Styles"
import { createRequests } from "./helpers/requests"
import { useConnection } from "./hooks/useConnection"

const noop = undefined

const { fetchUser, onAccountsChanged, providerInfo } = createRequests({ rdns: "tech.happy" })

export function Badge({ disableStyles = false }: { disableStyles?: boolean | string }): JSX.Element {
    const [user, setUser] = useState<HappyUser | undefined>(undefined)
    const [initialized, setInitialized] = useState(false)
    const [errored, setErrored] = useState(false)

    const { connect, disconnect, connecting } = useConnection()

    useEffect(() => {
        async function init() {
            try {
                const user = await fetchUser()
                setUser(user)
                setInitialized(true)
            } catch (e) {
                console.error(e)
                setErrored(true)
            }
        }

        init()

        return onAccountsChanged(setUser)
    }, [])

    const connected = Boolean(user?.address)

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
                    className={!connected ? `${state} animated` : state}
                >
                    <span>
                        <Logo info={provider} />
                        <Animated state={state}>
                            <ConnectionStatus initialized={initialized} connecting={connecting} user={user} />
                        </Animated>
                    </span>
                </Button>
            )}
        </div>
    )
}
