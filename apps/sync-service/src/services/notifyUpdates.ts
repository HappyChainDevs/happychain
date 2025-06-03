import type { Address } from "@happy.tech/common"
import type { SSEStreamingApi } from "hono/streaming"
import type { UpdateEvent } from "../dtos"

const streams = new Map<Address, SSEStreamingApi[]>()

export function notifyUpdates(event: UpdateEvent) {
    const userStreams = streams.get(event.data.destination)
    if (!userStreams) {
        return
    }

    for (const stream of userStreams) {
        stream.writeSSE({
            data: JSON.stringify(event.data),
            event: event.event,
            id: event.id,
        })
    }
}

export function getStream(address: Address) {
    return streams.get(address)
}

export function saveStream(address: Address, stream: SSEStreamingApi) {
    const userStreams = streams.get(address)
    if (!userStreams) {
        streams.set(address, [stream])
    } else {
        userStreams.push(stream)
    }
}