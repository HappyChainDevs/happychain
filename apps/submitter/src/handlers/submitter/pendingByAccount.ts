import { getUserBuffers } from "#src/nonceQueueManager"

import { executeHappyTxQueueManager, submitHappyTxQueueManager } from "#src/services"

export async function pendingByAccount({ account }: { account: `0x${string}` }) {
    // fetch all pending and merge, sort
    const executePending = getUserBuffers(executeHappyTxQueueManager, account)
    const submitPending = getUserBuffers(submitHappyTxQueueManager, account)

    return executePending.concat(submitPending).sort((a, b) => {
        if (a.nonceTrack === b.nonceTrack) return Number(a.nonceValue - b.nonceValue)
        return Number(a.nonceTrack - b.nonceTrack)
    })
}
