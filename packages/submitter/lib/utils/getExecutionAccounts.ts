import type { PrivateKeyAccount } from "viem"
import { env } from "#lib/env"
import { privateKeyToExecutionAccount } from "./privateKeyToExecutionAccount"

const executionAccounts: PrivateKeyAccount[] = env.EXECUTOR_KEYS.map(privateKeyToExecutionAccount)

export function getExecutionAccounts(): PrivateKeyAccount[] {
    return executionAccounts
}

export function getDefaultExecutionAccount(): PrivateKeyAccount {
    return executionAccounts[0]
}
