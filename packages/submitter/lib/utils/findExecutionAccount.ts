import type { Account } from "viem"
import { ExecutorCacheService } from "#lib/services/ExecutorCacheService"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { computeBoopHash } from "./computeBoopHash"
import { getDefaultExecutionAccount, getExecutionAccounts } from "./getExecutionAccounts"

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

const executorService = new ExecutorCacheService(getExecutionAccounts())
const defaultAccount = getDefaultExecutionAccount()

export function findExecutionAccount(tx?: HappyTx): Account {
    if (!tx) return defaultAccount

    const hash = computeBoopHash(tx)
    return executorService.get(hash, tx.account, tx.nonceTrack)
}
