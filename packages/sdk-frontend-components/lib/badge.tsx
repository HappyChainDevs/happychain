/** @jsxImportSource preact */
import { onUserUpdate } from "@happychain/js"
import type { HappyUser } from "@happychain/sdk-shared"
import { useEffect, useState } from "preact/hooks"
import { useConnection } from "./useConnection.ts"

import badgeStyles from "./styles/badge.css?inline"
import propertyStyles from "./styles/property.css?inline"

export type BadgeProps = { disableStyles?: boolean | string }

export function Badge({ disableStyles = false }: BadgeProps) {
    const [user, setUser] = useState<HappyUser | undefined>(undefined)

    const { connecting, connect, disconnect } = useConnection()

    useEffect(() => {
        return onUserUpdate((user) => {
            setUser(user)
        })
    }, [])

    const connected = !!user?.address
    const onClick = connecting ? undefined : connected ? disconnect : connect
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
                    <img src="/happychain.png" alt="HappyChain logo" className="happychain-icon" />
                    <div className="happychain-status">{connecting ? "Connecting" : user ? user.email : "Connect"}</div>
                </span>
            </button>
        </div>
    )
}
