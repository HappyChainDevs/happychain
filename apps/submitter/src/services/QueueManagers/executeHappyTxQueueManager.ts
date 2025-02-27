import env from "#src/env"
import { NonceQueueManager } from "#src/nonceQueueManager"
import { fetchNonce } from "#src/utils/fetchNonce"
import { executeHappyTx } from "./processors/executeHappyTx"

export const executeHappyTxQueueManager = new NonceQueueManager(
    env.LIMITS_EXECUTE_BUFFER_LIMIT,
    env.LIMITS_EXECUTE_MAX_CAPACITY,
    executeHappyTx,
    fetchNonce,
)
