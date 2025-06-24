import { promiseWithResolvers } from "@happy.tech/common"
import type { SSEStreamingApi } from "hono/streaming"
import { saveStream } from "../../services/notifyUpdates"
import type { SubscribeInput } from "./types"

export async function subscribe(input: SubscribeInput, stream: SSEStreamingApi) {
    const { promise, reject } = promiseWithResolvers<void>()

    console.log("Subscribing to updates for user", input.user)

    stream.onAbort(() => {
        reject(undefined)
    })

    saveStream(input.user, stream)

    await promise
}
