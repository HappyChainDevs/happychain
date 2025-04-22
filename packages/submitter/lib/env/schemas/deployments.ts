import { z } from "zod"
import { deployment } from "#lib/deployments"
import { isHexString } from "#lib/utils/zod/refines/isHexString"

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
    CHAIN_ID: z.coerce.number(),
    RPC_URL: z.string().url().optional(),
    DEPLOYMENT_ENTRYPOINT: z.string().refine(isHexString).default(DEPLOYMENT_ENTRYPOINT),
    DEPLOYMENT_ACCOUNT_FACTORY: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_FACTORY),
    DEPLOYMENT_ACCOUNT_IMPLEMENTATION: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_IMPLEMENTATION),
})
