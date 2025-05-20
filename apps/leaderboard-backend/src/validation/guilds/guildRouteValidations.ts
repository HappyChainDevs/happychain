import { resolver, validator as zValidator } from "hono-openapi/zod"
import { createSuccessResponseSchema } from "../common"
import {
    GuildCreateRequestSchema,
    GuildIdParamSchema,
    GuildMemberAddRequestSchema,
    GuildMemberIdParamSchema,
    GuildMemberResponseSchema,
    GuildMemberResponseSchemaArray,
    GuildMemberUpdateRequestSchema,
    GuildQuerySchema,
    GuildResponseSchema,
    GuildResponseSchemaArray,
    GuildUpdateRequestSchema,
} from "./guildSchemas"

export const GuildResponseSchemaObj = resolver(createSuccessResponseSchema(GuildResponseSchema))
export const GuildListResponseSchemaObj = resolver(createSuccessResponseSchema(GuildResponseSchemaArray))
export const GuildMemberResponseSchemaObj = resolver(createSuccessResponseSchema(GuildMemberResponseSchema))
export const GuildMemberListResponseSchemaObj = resolver(createSuccessResponseSchema(GuildMemberResponseSchemaArray))

export const GuildQueryValidation = zValidator("query", GuildQuerySchema)
export const GuildCreateValidation = zValidator("json", GuildCreateRequestSchema)
export const GuildUpdateValidation = zValidator("json", GuildUpdateRequestSchema)
export const GuildMemberAddValidation = zValidator("json", GuildMemberAddRequestSchema)
export const GuildMemberUpdateValidation = zValidator("json", GuildMemberUpdateRequestSchema)
export const GuildIdParamValidation = zValidator("param", GuildIdParamSchema)
export const GuildMemberIdParamValidation = zValidator("param", GuildMemberIdParamSchema)
