import { type Account, type PrivateKeyAccount, createNonceManager } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { jsonRpc } from "viem/nonce"
import { env } from "#lib/env"
import { ExecutorCacheService } from "#lib/services/ExecutorCacheService"
import type { Boop } from "#lib/types"
import { logger } from "#lib/utils/logger"
import { computeHash } from "../utils/boop/computeHash"

/**
  flowchart TD
    A[New Request: hash + account + nonceTrack] --> B[Construct Key: account-nonceTrack]
    B --> C{Key exists in expiryMap?}
    
    C -->|Yes| D{Hash exists in key's entries?}
    C -->|No| E[Create New Entry]
    
    D -->|Yes| F[Reset hash's timeout]
    D -->|No| G[Track new hash with timeout]
    
    E --> H[Get least-used executor from heap]
    H --> I[Create expiration entry with hash]
    I --> J[Increment executor's job count]
    
    G --> K[Add hash to existing] 
    K --> L[Increment job count]
    L --> M[Set new timeout]
    
    F --> N[Cancel old timeout]
    N --> O[Set new timeout]
    
    J --> P[Store expiration entry]
    M --> Q[Continue processing]
    O --> Q
    P --> Q
 */

const nonceManager = createNonceManager({ source: jsonRpc() })

const evmAccounts: PrivateKeyAccount[] = env.EXECUTOR_KEYS.map((key) => privateKeyToAccount(key, { nonceManager }))
const executorService = new ExecutorCacheService(evmAccounts)

export const defaultAccount: Account = evmAccounts[0]

export function findExecutionAccount(tx?: Boop): Account {
    if (!tx) return defaultAccount

    const hash = computeHash(tx)
    return executorService.get(hash, tx.account, tx.nonceTrack)
}

function getAccountDeployer(): Account {
    if (env.PRIVATE_KEY_ACCOUNT_DEPLOYER) {
        try {
            return privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER, { nonceManager })
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
