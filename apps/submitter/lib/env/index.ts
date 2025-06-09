import { z } from "zod"
import "zod-openapi/extend" // Adds .openapi(...) to zod so that we can document the API as we validate

import { getAbis, getDeployment } from "./deployment"
import { appSchema } from "./schemas/app"
import { deploymentsSchema } from "./schemas/deployments"
import { gasSchema } from "./schemas/gas"
import { limitsSchema } from "./schemas/limits"
import { tuningSchema } from "./schemas/tuning"

const envSchema = z
    .object({
        ANVIL_PORT: z.coerce.number().int().positive().optional().default(8545),
        PROXY_PORT: z.coerce.number().int().positive().optional().default(8546),
    })
    .merge(appSchema)
    .merge(limitsSchema)
    .merge(deploymentsSchema)
    .merge(gasSchema)
    .merge(tuningSchema)

/**
 * Provides access to filtered and validated environment variables, which define the configuration of the submitter.
 */

export const env: Environment = envSchema.parse(process.env)
export type Environment = z.infer<typeof envSchema>

/**
 * Provides access to the Boop contract addresses and their ABIs.
 * The correct deployment and ABIs are selected based on the environment configuration.
 */
export const deployment = getDeployment(env)
export const abis = getAbis(env)

export const isProduction = ["staging", "production"].includes(env.NODE_ENV)
