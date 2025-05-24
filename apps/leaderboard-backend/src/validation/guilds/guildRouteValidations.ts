import { validator as zValidator } from "hono-openapi/zod"
import {
    GuildCreateRequestSchema,
    GuildIdParamSchema,
    GuildMemberAddRequestSchema,
    GuildMemberIdParamSchema,
    GuildMemberUpdateRequestSchema,
    GuildQuerySchema,
    GuildUpdateRequestSchema,
} from "./guildSchemas"

export const GuildQueryValidation = zValidator("query", GuildQuerySchema)

export const GuildCreateValidation = zValidator("json", GuildCreateRequestSchema)

export const GuildUpdateValidation = zValidator("json", GuildUpdateRequestSchema)

export const GuildMemberAddValidation = zValidator("json", GuildMemberAddRequestSchema)

export const GuildMemberUpdateValidation = zValidator("json", GuildMemberUpdateRequestSchema)

export const GuildIdParamValidation = zValidator("param", GuildIdParamSchema)

export const GuildMemberIdParamValidation = zValidator("param", GuildMemberIdParamSchema)
