import type { Account } from "viem"
import { env } from "#lib/env"
import { logger } from "#lib/logger"
import { getDefaultExecutionAccount } from "./getExecutionAccounts"
import { privateKeyToExecutionAccount } from "./privateKeyToExecutionAccount"

export function getAccountDeployerAccount(): Account {
    if (env.PRIVATE_KEY_ACCOUNT_DEPLOYER) {
        try {
            return privateKeyToExecutionAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER)
        } catch (error) {
            logger.warn(
                "Failed to parse PRIVATE_KEY_ACCOUNT_DEPLOYER. Falling back to default execution account.",
                error,
            )
        }
    }
    return getDefaultExecutionAccount()
}
