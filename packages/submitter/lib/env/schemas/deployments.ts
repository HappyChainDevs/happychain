import { z } from "zod"
import { isHexString } from "#lib/utils/zod/refines/isHexString"

export const deploymentsSchema = z.object({
    CHAIN_ID: z.coerce.number(),
    RPC_URL: z.string().url().optional(),
    DEPLOYMENT_ENTRYPOINT: z.string().refine(isHexString).optional(),
    DEPLOYMENT_ACCOUNT_FACTORY: z.string().refine(isHexString).optional(),
    DEPLOYMENT_ACCOUNT_IMPLEMENTATION: z.string().refine(isHexString).optional(),
})
