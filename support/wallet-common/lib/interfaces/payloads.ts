import type { UUID } from "@happy.tech/common"

type MessageChannelEventPayload<T = unknown> = {
    // request event unique key
    key: UUID
    // window identifier
    windowId: UUID
    payload: T
}

export type ProviderEventPayload<T = unknown> = MessageChannelEventPayload<T> & {
    error: null
}

export type ProviderEventError<T = unknown> = MessageChannelEventPayload<null> & {
    error: T
}
