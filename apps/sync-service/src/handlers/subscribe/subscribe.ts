import type { SSEStreamingApi } from "hono/streaming"
import { promiseWithResolvers } from "@happy.tech/common"
import { saveStream } from "../../services/notifyUpdates"
import type { SubscribeInput } from "./types"

export async function subscribe(input: SubscribeInput, stream: SSEStreamingApi) {
    const {promise, reject } = promiseWithResolvers<void>()

    stream.onAbort(() => {
        reject(undefined)
    })

    saveStream(input.user, stream)

    await promise
}
