import { validator as zValidator } from "hono-openapi/zod"
import { AuthChallengeRequestSchema, AuthVerifyRequestSchema, SessionIdRequestSchema } from "./authSchemas"

export const AuthChallengeValidation = zValidator("json", AuthChallengeRequestSchema)

export const AuthVerifyValidation = zValidator("json", AuthVerifyRequestSchema)

export const SessionIdValidation = zValidator("json", SessionIdRequestSchema)
