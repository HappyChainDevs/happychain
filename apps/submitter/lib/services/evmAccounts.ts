import { type Account, type PrivateKeyAccount, createNonceManager } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { jsonRpc } from "viem/nonce"
import { env } from "#lib/env"
import { ExecutorCacheService } from "#lib/services/ExecutorCacheService"
import { traceFunction } from "#lib/telemetry/traces.ts"
import type { Boop } from "#lib/types"
import { computeHash } from "#lib/utils/boop/computeHash"
import { logger } from "#lib/utils/logger"

export const evmNonceManager = createNonceManager({ source: jsonRpc() })

export const executorAccounts: PrivateKeyAccount[] = env.EXECUTOR_KEYS.map((key) =>
    privateKeyToAccount(key, { nonceManager: evmNonceManager }),
)
const executorService = new ExecutorCacheService(executorAccounts)

export const defaultAccount: Account = executorAccounts[0]

function findExecutionAccount(tx?: Boop): Account {
    if (!tx) return defaultAccount

    const hash = computeHash(tx)
    return executorService.get(hash, tx.account, tx.nonceTrack)
}

function getAccountDeployer(): Account {
    if (env.PRIVATE_KEY_ACCOUNT_DEPLOYER) {
        try {
            return privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER, { nonceManager: evmNonceManager })
        } catch (error) {
            logger.warn(
                "Failed to parse PRIVATE_KEY_ACCOUNT_DEPLOYER. Falling back to default execution account.",
                error,
            )
        }
    }
    return defaultAccount
}

export const accountDeployer: Account = getAccountDeployer()

const tracedFindExecutionAccount = traceFunction(findExecutionAccount)

export { tracedFindExecutionAccount as findExecutionAccount }
