import { z } from "zod"
import { getDeployment } from "#lib/env/deployment"
// Adds .openapi(...) to zod so that we can document the API as we validate
import "zod-openapi/extend"
import { appSchema } from "./schemas/app"
import { deploymentsSchema } from "./schemas/deployments"
import { gasSchema } from "./schemas/gas"
import { limitsSchema } from "./schemas/limits"

const envSchema = z
    .object({}) //
    .merge(appSchema)
    .merge(limitsSchema)
    .merge(deploymentsSchema)
    .merge(gasSchema)

/**
 * Provides accesss to filtered and validated environment variables, which define the configuration of the submitter.
 */
export const env: Environment = envSchema.parse(process.env)
export type Environment = z.infer<typeof envSchema>

/**
 * Provides access to the Boop contract addreses.
 */
export const deployment = getDeployment(env)

export {
    /** Provides access to the ABIs of the contracts available in {@link deployment}. */
    abis,
} from "#lib/env/deployment"
