import { onUserUpdate } from "@happychain/js"
/** @jsxImportSource preact */
import type { HappyUser } from "@happychain/sdk-shared"
import { useEffect, useState } from "preact/hooks"
import { ConnectionStatus } from "./components/ConnectionStatus"
import { Logo } from "./components/Logo"
import { Styles } from "./components/Styles"
import { createRequests } from "./helpers/requests"
import { useConnection } from "./hooks/useConnection"

if (import.meta.hot) {
    // web components don't handle HMR well
    import.meta.hot.accept(() => {
        location.reload()
    })
}

const noop = undefined

const { fetchUser, providerInfo } = createRequests({ rdns: "tech.happy" })

export type BadgeProps = { disableStyles?: boolean | string }

export function Badge({ disableStyles = false }: BadgeProps) {
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

        return onUserUpdate(setUser)
    }, [])

    const connected = Boolean(user?.address)
    const onClick = !initialized || connecting ? noop : connected ? disconnect : connect
    const state = !initialized ? "initializing" : connecting ? "connecting" : connected ? "connected" : "disconnected"
    const provider = providerInfo()

    return (
        <div>
            {<Styles disableStyles={disableStyles} />}
            {errored || !provider ? (
                <button type={"button"} className={"error happychain-badge"} disabled={true}>
                    <span>Connection Error</span>
                </button>
            ) : (
                <button
                    type={"button"}
                    className={`${!connected ? `${state} animated` : state} happychain-badge`}
                    onClick={onClick}
                    disabled={!initialized || connecting}
                >
                    <span>
                        <Logo info={provider} />
                        <div className="happychain-status">
                            <ConnectionStatus initialized={initialized} connecting={connecting} user={user} />
                        </div>
                    </span>
                </button>
            )}
        </div>
    )
}
