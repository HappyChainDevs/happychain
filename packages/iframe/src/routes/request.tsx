import type { EventUUID } from '@happychain/sdk-shared'
import { createFileRoute } from '@tanstack/react-router'

type RequestArgs = {
    args: string
    key: EventUUID
}

export const Route = createFileRoute('/request')({
    validateSearch: (search: Record<string, unknown>): RequestArgs => {
        // validate and parse the search params into a typed state
        return {
            args: (search.args as string) || '',
            key: (search.key as EventUUID) || '',
        }
    },
})
