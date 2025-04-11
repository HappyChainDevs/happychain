import type { Account } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import env from "#lib/env"
import { ExecutorCacheService } from "#lib/services/ExecutorCacheService.ts"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { computeHappyTxHash } from "./computeHappyTxHash"

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

const executorService = new ExecutorCacheService()

const accounts = env.EXECUTOR_KEYS.map((key) => privateKeyToAccount(key))
const defaultAccount = accounts[0]

for (const account of accounts) {
    executorService.registerExecutor(account)
}

// use mnemonic to derive multiple wallets from a single seed?
// const account = mnemonicToAccount("legal winner thank year wave sausage worth useful legal winner thank yellow", {
//     /** The account index to use in the path (`"m/44'/60'/${accountIndex}'/0/0"`). */
//     accountIndex: 0,
//     /** The change index to use in the path (`"m/44'/60'/0'/${changeIndex}/0"`). */
//     changeIndex: 0,
//     /** The address index to use in the path (`"m/44'/60'/0'/0/${addressIndex}"`). */
//     addressIndex: 0,
// })

export function findExecutionAccount(tx?: HappyTx): Account {
    if (!tx) return defaultAccount
    const account = tx.account
    const nonceTrack = tx.nonceTrack

    const hash = computeHappyTxHash(tx)

    return executorService.get(hash, account, nonceTrack)
}
