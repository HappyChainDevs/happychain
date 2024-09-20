import type { UUID } from "@happychain/common"
import { createFileRoute } from "@tanstack/react-router"

type RequestArgs = {
    args: string
    key: UUID
    windowId: UUID
}

export const Route = createFileRoute("/request")({
    validateSearch: (search: Record<string, unknown>): RequestArgs => {
        // validate and parse the search params into a typed state
        return {
            args: search.args || "",
            key: search.key || "",
            windowId: search.windowId || "",
        } as RequestArgs
    },
})
