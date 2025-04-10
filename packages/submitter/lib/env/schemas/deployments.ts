import { deployment } from "@happy.tech/contracts/boop/anvil"
import { localhost } from "viem/chains"
import { z } from "zod"
import { isHexString } from "#lib/utils/zod/refines/isHexString"

// Defaults to Anvil. Configure the chain id and deployment addresses in the .env file
const DEFAULT_CHAIN_ID = localhost.id
const DEPLOYMENT_ENTRYPOINT = deployment.EntryPoint
const DEPLOYMENT_ACCOUNT_FACTORY = deployment.HappyAccountFactory
const DEPLOYMENT_ACCOUNT_IMPLEMENTATION = deployment.HappyAccount

export const deploymentsSchema = z.object({
    CHAIN_ID: z.coerce.number().default(DEFAULT_CHAIN_ID),

    DEPLOYMENT_ENTRYPOINT: z.string().refine(isHexString).default(DEPLOYMENT_ENTRYPOINT),
    DEPLOYMENT_ACCOUNT_FACTORY: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_FACTORY),
    DEPLOYMENT_ACCOUNT_IMPLEMENTATION: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_IMPLEMENTATION),
})
