import { createNonceManager } from "viem"
import { type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts"
import { jsonRpc } from "viem/nonce"

const nonceManager = createNonceManager({ source: jsonRpc() })

export function privateKeyToExecutionAccount(key: `0x${string}`): PrivateKeyAccount {
    return privateKeyToAccount(key, { nonceManager })
}
