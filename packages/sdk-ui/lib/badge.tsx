/** @jsxImportSource preact */
import { onUserUpdate } from "@happychain/js"
import type { HappyUser } from "@happychain/sdk-shared"
import { useEffect, useState } from "preact/hooks"
import { ConnectionStatus } from "./components/ConnectionStatus"
import { Logo } from "./components/Logo"
import { Styles } from "./components/Styles"
import { getProvider } from "./helpers/getProvider"
import { useConnection } from "./hooks/useConnection"

if (import.meta.hot) {
    // web components don't handle HMR well
    import.meta.hot.accept(() => {
        location.reload()
    })
}

const noop = undefined

export type BadgeProps = { disableStyles?: boolean | string }
const provider = getProvider({ rdns: "tech.happy" })

export function Badge({ disableStyles = false }: BadgeProps) {
    const [user, setUser] = useState<HappyUser | undefined>(undefined)
    const [initialized, setInitialized] = useState(false)

    const { connect, disconnect, connecting } = useConnection()

    useEffect(() => {
        return onUserUpdate((_user) => {
            setUser(_user)
            setInitialized(true)
        })
    }, [])

    const connected = Boolean(user?.address)
    const onClick = !initialized || connecting ? noop : connected ? disconnect : connect
    const state = !initialized ? "initializing" : connecting ? "connecting" : connected ? "connected" : "disconnected"

    return (
        <div>
            <Styles disableStyles={disableStyles} />
            {!provider ? (
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
                        <Logo info={provider.info} />
                        <div className="happychain-status">
                            <ConnectionStatus initialized={initialized} connecting={connecting} user={user} />
                        </div>
                    </span>
                </button>
            )}
        </div>
    )
}
