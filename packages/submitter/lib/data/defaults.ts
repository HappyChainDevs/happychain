import { deployment } from "@happy.tech/contracts/happy-aa/anvil"
import { localhost } from "viem/chains"

export const DEFAULT_RECEIPT_TIMEOUT_MS = 8_000

export const DEFAULT_LOG_LEVEL = "info"
export const DEFAULT_NODE_ENV = "development"
export const DEFAULT_APP_PORT = 3001
export const DEFAULT_BUFFER_LIMIT = 50
export const DEFAULT_MAX_CAPACITY = 100

// Defaults to Anvil. Configure the chain id and deployment addresses in the .env file
export const DEFAULT_CHAIN_ID = localhost.id
export const DEPLOYMENT_ENTRYPOINT = deployment.HappyEntryPoint
export const DEPLOYMENT_ACCOUNT_FACTORY = deployment.ScrappyAccountFactory
export const DEPLOYMENT_ACCOUNT_IMPLEMENTATION = deployment.ScrappyAccount
