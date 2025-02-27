import env from "#src/env"
import { createNonceQueueManager } from "#src/nonceQueueManager"
import { fetchNonce } from "#src/utils/fetchNonce"
import { submitHappyTx } from "./processors/submitHappyTx"

export const submitHappyTxQueueManager = createNonceQueueManager(
    env.LIMITS_SUBMIT_BUFFER_LIMIT,
    env.LIMITS_EXECUTE_MAX_CAPACITY,
    submitHappyTx,
    fetchNonce,
)
