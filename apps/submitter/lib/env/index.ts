import { z } from "zod"
import "zod-openapi/extend" // Adds .openapi(...) to zod so that we can document the API as we validate
import { getAbis, getDeployment } from "./deployment"
import { appSchema } from "./schemas/app"
import { deploymentsSchema } from "./schemas/deployments"
import { gasSchema } from "./schemas/gas"
import { limitsSchema } from "./schemas/limits"

const baseEnvSchema = z
    .object({}) //
    .merge(appSchema) // appSchema includes NODE_ENV with its default
    .merge(limitsSchema)
    .merge(deploymentsSchema)
    .merge(gasSchema)
    .extend({
        // Define ANVIL_PORT and PROXY_PORT as optional initially
        ANVIL_PORT: z.coerce.number().int().positive().optional(),
        PROXY_PORT: z.coerce.number().int().positive().optional(),
    })
type PreRefinementEnv = z.infer<typeof baseEnvSchema>
const envSchema = baseEnvSchema
    .superRefine((data: PreRefinementEnv, ctx: z.RefinementCtx) => {
        if (data.NODE_ENV === "test") {
            if (data.ANVIL_PORT === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "ANVIL_PORT is required when NODE_ENV is 'test'",
                    path: ["ANVIL_PORT"],
                })
            }
            if (data.PROXY_PORT === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "PROXY_PORT is required when NODE_ENV is 'test'",
                    path: ["PROXY_PORT"],
                })
            }
        }
    })
    .transform((data: PreRefinementEnv) => {
        if (data.NODE_ENV === "test") {
            return {
                ...data,
                ANVIL_PORT: data.ANVIL_PORT!,
                PROXY_PORT: data.PROXY_PORT!,
            }
        } else {
            // If not in 'test' environment, remove these properties from the object and its type.
            const { ANVIL_PORT, PROXY_PORT, ...rest } = data
            return rest
        }
    })

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
