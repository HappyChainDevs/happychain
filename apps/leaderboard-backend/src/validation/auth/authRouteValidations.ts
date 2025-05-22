import { resolver, validator as zValidator } from "hono-openapi/zod"
import { createSuccessResponseSchema } from "../common"
import {
    AuthChallengeDataSchema,
    AuthChallengeRequestSchema,
    AuthResponseDataSchema,
    AuthVerifyRequestSchema,
    SessionIdRequestSchema,
    SessionListDataSchema,
} from "./authSchemas"

export const AuthResponseSchemaObj = resolver(createSuccessResponseSchema(AuthResponseDataSchema))
export const AuthChallengeResponseSchemaObj = resolver(createSuccessResponseSchema(AuthChallengeDataSchema))
export const SessionListResponseSchemaObj = resolver(createSuccessResponseSchema(SessionListDataSchema))

export const AuthChallengeValidation = zValidator("json", AuthChallengeRequestSchema)
export const AuthVerifyValidation = zValidator("json", AuthVerifyRequestSchema)
export const SessionIdValidation = zValidator("json", SessionIdRequestSchema)
