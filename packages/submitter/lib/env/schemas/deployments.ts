import { localhost } from "viem/chains"
import { z } from "zod"
import { deployment } from "#lib/deployments"
import { isHexString } from "#lib/utils/zod/refines/isHexString"

// Defaults to Anvil. Configure the chain id and deployment addresses in the .env file
const DEFAULT_CHAIN_ID = localhost.id
const DEPLOYMENT_ENTRYPOINT = deployment.EntryPoint

/**
 * Used to create accounts, and to compute happy account address
 * off-chain
 */
const DEPLOYMENT_ACCOUNT_FACTORY = deployment.HappyAccountBeaconProxyFactory

/**
 * Used to compute HappyAccount address off-chain
 */
const DEPLOYMENT_ACCOUNT_IMPLEMENTATION = deployment.HappyAccountImpl

export const deploymentsSchema = z.object({
    CHAIN_ID: z.coerce.number().default(DEFAULT_CHAIN_ID),

    DEPLOYMENT_ENTRYPOINT: z.string().refine(isHexString).default(DEPLOYMENT_ENTRYPOINT),
    DEPLOYMENT_ACCOUNT_FACTORY: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_FACTORY),
    DEPLOYMENT_ACCOUNT_IMPLEMENTATION: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_IMPLEMENTATION),
})
