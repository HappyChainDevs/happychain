import { resolver, validator as zValidator } from "hono-openapi/zod"
import { createSuccessResponseSchema } from "../common"
import {
    AdminWalletParamSchema,
    GameCreateRequestSchema,
    GameIdParamSchema,
    GameListResponseSchema,
    GameQuerySchema,
    GameResponseSchema,
    GameScoresQuerySchema,
    GameUpdateRequestSchema,
    ScoreSubmitRequestSchema,
    UserGameScoreResponseSchema,
    UserWalletParamSchema,
} from "./gameSchemas"

export const GameResponseSchemaObj = resolver(createSuccessResponseSchema(GameResponseSchema))
export const GameListResponseSchemaObj = resolver(createSuccessResponseSchema(GameListResponseSchema))
export const UserGameScoreResponseSchemaObj = resolver(createSuccessResponseSchema(UserGameScoreResponseSchema))

export const GameQueryValidation = zValidator("query", GameQuerySchema)
export const GameCreateValidation = zValidator("json", GameCreateRequestSchema)
export const GameIdParamValidation = zValidator("param", GameIdParamSchema)
export const AdminWalletParamValidation = zValidator("param", AdminWalletParamSchema)
export const GameUpdateValidation = zValidator("json", GameUpdateRequestSchema)
export const ScoreSubmitValidation = zValidator("json", ScoreSubmitRequestSchema)
export const GameScoresQueryValidation = zValidator("query", GameScoresQuerySchema)
export const UserWalletParamValidation = zValidator("param", UserWalletParamSchema)
