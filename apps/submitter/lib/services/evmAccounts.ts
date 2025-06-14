import type { Account, PrivateKeyAccount } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import { ExecutorCacheService } from "#lib/services/ExecutorCacheService"
import { traceFunction } from "#lib/telemetry/traces"
import type { Boop } from "#lib/types"
import { computeHash } from "#lib/utils/boop/computeHash"
import { logger } from "#lib/utils/logger"

export const executorAccounts: PrivateKeyAccount[] = env.EXECUTOR_KEYS.map((key) => privateKeyToAccount(key))
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
            return privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER)
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

const tracedFindExecutionAccount = traceFunction(findExecutionAccount, "findExecutionAccount")

export { tracedFindExecutionAccount as findExecutionAccount }
