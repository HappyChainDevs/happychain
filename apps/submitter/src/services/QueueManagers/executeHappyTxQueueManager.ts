import env from "#src/env"
import { createNonceQueueManager } from "#src/nonceQueueManager"
import { fetchNonce } from "#src/utils/fetchNonce"
import { executeHappyTx } from "./processors/executeHappyTx"

export const executeHappyTxQueueManager = createNonceQueueManager(
    env.LIMITS_EXECUTE_BUFFER_LIMIT,
    env.LIMITS_EXECUTE_MAX_CAPACITY,
    executeHappyTx,
    fetchNonce,
)
