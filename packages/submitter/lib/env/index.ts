import { z } from "zod"
import { getDeployment } from "#lib/env/deployment"
// Adds .openapi(...) to zod so that we can document the API as we validate
import "zod-openapi/extend"
import { appSchema } from "./schemas/app"
import { deploymentsSchema } from "./schemas/deployments"
import { limitsSchema } from "./schemas/limits"

const envSchema = z
    .object({}) //
    .merge(appSchema)
    .merge(limitsSchema)
    .merge(deploymentsSchema)

export const env: Environment = envSchema.parse(process.env)
export type Environment = z.infer<typeof envSchema>
export const deployment = getDeployment(env)
export { abis } from "#lib/env/deployment"
