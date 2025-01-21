/** @jsxImportSource preact */
import { type HappyUser, onUserUpdate } from "@happychain/js"
import { useEffect, useState } from "preact/hooks"
import { useConnection } from "./useConnection"

import badgeStyles from "./styles/badge.css?inline"
import propertyStyles from "./styles/property.css?inline"

export type BadgeProps = { disableStyles?: boolean | string }

export function Badge({ disableStyles = false }: BadgeProps) {
    const [user, setUser] = useState<HappyUser | undefined>(undefined)

    const { connecting, connect, open } = useConnection()

    useEffect(() => onUserUpdate((user: HappyUser | undefined) => setUser(user)), [])

    const connected = !!user?.address
    const onClick = connecting ? undefined : connected ? open : connect
    const state = connecting ? "connecting" : connected ? "connected" : "disconnected"

    return (
        <div>
            {
                // biome-ignore format: readability
                (typeof disableStyles === "boolean" ? (disableStyles) : disableStyles !== "false")
                  ? undefined
                  : <style>
                      {propertyStyles}
                      {badgeStyles}
                  </style>
            }
            <button
                type={"button"}
                className={`${!connected ? `${state} animated` : state} happychain-badge`}
                onClick={onClick}
                disabled={connecting}
            >
                <span>
                    <UserAvatar user={user} />
                    <div className="happychain-status">
                        <UserLabel user={user} connecting={connecting} />
                    </div>
                </span>
            </button>
        </div>
    )
}

const UserLabel = ({ user, connecting }: { user: HappyUser | undefined; connecting: boolean }) => {
    if (connecting) return <>Connecting</>
    if (!user) return <>Connect</>

    const label = user.ens || user.email || user.name
    return <>{label.length > 12 ? `${label.slice(0, 9)}...` : label}</>
}

const UserAvatar = ({ user }: { user: HappyUser | undefined }) => {
    const [loadFailed, setLoadFailed] = useState(false)
    if (!user?.avatar || loadFailed) {
        // TODO: This works for our demos because they all have this file at the root.
        // Later, we need to replace this with a happy.tech URL.
        return <img src="/happychain.png" alt="HappyChain logo" className="happychain-icon" />
    }

    return (
        <img src={user?.avatar} alt="HappyChain logo" className="happychain-icon" onError={() => setLoadFailed(true)} />
    )
}
