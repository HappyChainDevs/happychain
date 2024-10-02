/** @jsxImportSource preact */
import type { HappyUser } from "@happychain/sdk-shared"

export function ConnectionStatus({
    initialized,
    connecting,
    user,
}: { initialized: boolean; connecting: boolean; user?: HappyUser }) {
    if (!initialized) return <>Loading</>
    if (connecting) return <>Connecting</>
    if (user) return <>{user.email}</>
    return <>Connect</>
}
